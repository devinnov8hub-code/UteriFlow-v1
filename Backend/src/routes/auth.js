import express from 'express';
import { createClient } from '@supabase/supabase-js';
import supabase, { supabaseAdmin } from '../config/supabase.js';
import { validate } from '../middleware/validate.js';
import { authValidators } from '../validators/index.js';
import { generateOTP, isOTPExpired, getOTPExpiryTime, hasExceededAttempts } from '../utils/otp.js';
import {
  sendOTPEmail,
  sendPasswordResetOTPEmail,
  sendWelcomeEmail,
  sendPasswordChangedEmail,
} from '../utils/email.js';
import { ValidationError, ConflictError, NotFoundError, AppError } from '../errors/index.js';

const router = express.Router();

const getAuthedClient = (accessToken) => {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
};


const withPurpose = (query, purpose) => {
  
  return query.eq('purpose', purpose);
};

router.post('/email/check', authValidators.email, validate, async (req, res, next) => {
  try {
    const { email } = req.body;
    const { data, error } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    return res.json({ exists: data !== null, flow: data ? 'login' : 'register' });
  } catch (error) { next(error); }
});


router.post('/email/send-otp', authValidators.email, validate, async (req, res, next) => {
  try {
    const { email } = req.body;
    const otpCode = generateOTP();
    const expiresAt = getOTPExpiryTime();

    const adminClient = supabaseAdmin || supabase;
    const { data: verification, error: insertError } = await adminClient
      .from('email_verifications')
      .insert({ email, otp_code: otpCode, expires_at: expiresAt, verified: false, attempts: 0 })
      .select()
      .single();
    if (insertError) {
      console.error('[send-otp] DB insert failed:', JSON.stringify(insertError));
      throw insertError;
    }

    await sendOTPEmail(email, otpCode);
    return res.json({ message: 'Verification code sent to your email', verificationId: verification.id });
  } catch (error) { next(error); }
});


router.post('/email/verify', authValidators.verifyOtp, validate, async (req, res, next) => {
  try {
    const { email, code } = req.body;

    const { data: verification, error: fetchError } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('email', email)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (fetchError) throw fetchError;

    if (!verification) throw new NotFoundError('No pending verification found. Please request a new code.');
    if (hasExceededAttempts(verification.attempts)) throw new ValidationError('Too many failed attempts. Please request a new code.');
    if (isOTPExpired(verification.expires_at)) throw new ValidationError('Verification code has expired. Please request a new one.');

    if (verification.otp_code !== code) {
      await supabase.from('email_verifications').update({ attempts: verification.attempts + 1 }).eq('id', verification.id);
      const remaining = 5 - (verification.attempts + 1);
      throw new ValidationError(remaining > 0 ? `Invalid verification code. ${remaining} attempt(s) remaining.` : 'No attempts remaining. Please request a new code.');
    }

    await supabase.from('email_verifications').update({ verified: true }).eq('id', verification.id);
    return res.json({ message: 'Email verified successfully', verified: true, email });
  } catch (error) { next(error); }
});


router.post('/email/resend', authValidators.email, validate, async (req, res, next) => {
  try {
    const { email } = req.body;

    await supabase.from('email_verifications').update({ attempts: 99 }).eq('email', email).eq('verified', false);

    const otpCode = generateOTP();
    const expiresAt = getOTPExpiryTime();

    const adminClient = supabaseAdmin || supabase;
    const { data: verification, error: insertError } = await adminClient
      .from('email_verifications')
      .insert({ email, otp_code: otpCode, expires_at: expiresAt, verified: false, attempts: 0 })
      .select()
      .single();
    if (insertError) {
      console.error('[resend-otp] DB insert failed:', JSON.stringify(insertError));
      throw insertError;
    }

    await sendOTPEmail(email, otpCode);
    return res.json({ message: 'A new verification code has been sent to your email', verificationId: verification.id });
  } catch (error) { next(error); }
});

router.post('/password/create', authValidators.createPassword, validate, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const { data: verification, error: verifyError } = await supabase
      .from('email_verifications')
      .select('id')
      .eq('email', email)
      .eq('verified', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (verifyError) throw verifyError;
    if (!verification) throw new ValidationError('Email has not been verified. Please complete OTP verification first.');

    const { data: existingProfile } = await supabase.from('user_profiles').select('id').eq('email', email).maybeSingle();
    if (existingProfile) throw new ConflictError('An account with this email already exists. Please log in instead.');

    let user, session;

    if (supabaseAdmin) {
      const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { email_verified: true },
      });
      if (adminError) throw adminError;
      user = adminData?.user;
      const { error: profileError } = await supabaseAdmin.from('user_profiles').insert({ id: user.id, email, onboarding_completed: false });
      if (profileError) throw profileError;
    } else {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password, options: { data: { email_verified: true } } });
      if (signUpError) {
        if (signUpError.message?.toLowerCase().includes('already registered')) throw new ConflictError('An account with this email already exists.');
        throw signUpError;
      }
      user = authData?.user;
      session = authData?.session;
      if (!user) throw new AppError('Account creation failed.', 500, 'ACCOUNT_CREATION_FAILED');
      if (session?.access_token) {
        const authedClient = getAuthedClient(session.access_token);
        const { error: profileError } = await authedClient.from('user_profiles').insert({ id: user.id, email, onboarding_completed: false });
        if (profileError) throw profileError;
      }
    }

    if (!user) throw new AppError('Account creation failed.', 500, 'ACCOUNT_CREATION_FAILED');

    await supabase.from('email_verifications').update({ verified: false }).eq('email', email).eq('id', verification.id);

    sendWelcomeEmail(email, null).catch((e) => console.error('[Email] Welcome email failed:', e.message));

    return res.status(201).json({
      message: 'Account created successfully',
      user: { id: user.id, email: user.email, createdAt: user.created_at },
      session: session ? { accessToken: session.access_token, refreshToken: session.refresh_token, expiresAt: session.expires_at } : null,
    });
  } catch (error) { next(error); }
});

router.post('/login', authValidators.createPassword, validate, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      if (signInError.message?.toLowerCase().includes('invalid') || signInError.message?.toLowerCase().includes('credentials')) throw new ValidationError('Invalid email or password.');
      throw signInError;
    }
    if (!authData?.user || !authData?.session) throw new AppError('Login failed.', 500, 'LOGIN_FAILED');

    const { data: profile } = await supabase.from('user_profiles').select('id').eq('id', authData.user.id).maybeSingle();
    if (!profile) {
      const authedClient = getAuthedClient(authData.session.access_token);
      await authedClient.from('user_profiles').insert({ id: authData.user.id, email, onboarding_completed: false }).maybeSingle();
    }

    return res.json({
      message: 'Logged in successfully',
      user: { id: authData.user.id, email: authData.user.email, createdAt: authData.user.created_at },
      session: { accessToken: authData.session.access_token, refreshToken: authData.session.refresh_token, expiresAt: authData.session.expires_at },
    });
  } catch (error) { next(error); }
});

router.post('/token/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new ValidationError('Refresh token is required.');
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data?.session) throw new ValidationError('Invalid or expired refresh token. Please log in again.');
    return res.json({
      message: 'Token refreshed successfully',
      session: { accessToken: data.session.access_token, refreshToken: data.session.refresh_token, expiresAt: data.session.expires_at },
    });
  } catch (error) { next(error); }
});

router.post('/logout', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) await supabase.auth.signOut();
    return res.json({ message: 'Logged out successfully' });
  } catch (error) { next(error); }
});

router.post('/password/forgot', authValidators.email, validate, async (req, res, next) => {
  try {
    const { email } = req.body;
    const { data: profile } = await supabase.from('user_profiles').select('email').eq('email', email).maybeSingle();

    if (profile) {
      await supabase.from('email_verifications').update({ attempts: 99 }).eq('email', email).eq('verified', false);

      const otpCode = generateOTP();
      const expiresAt = getOTPExpiryTime();

      await supabase.from('email_verifications').insert({
        email, otp_code: otpCode, expires_at: expiresAt, verified: false, attempts: 0,
      });

      await sendPasswordResetOTPEmail(email, otpCode);
    }

    return res.json({ message: 'If an account with this email exists, a 6-digit reset code has been sent to your email.' });
  } catch (error) { next(error); }
});


router.post('/password/verify-code', authValidators.verifyResetCode, validate, async (req, res, next) => {
  try {
    const { email, code } = req.body;

    const { data: verification, error: fetchError } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('email', email)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (fetchError) throw fetchError;

    if (!verification) throw new NotFoundError('No pending reset found. Please request a new code.');
    if (hasExceededAttempts(verification.attempts)) throw new ValidationError('Too many failed attempts. Please request a new reset code.');
    if (isOTPExpired(verification.expires_at)) throw new ValidationError('Reset code has expired. Please request a new one.');

    if (verification.otp_code !== code) {
      await supabase.from('email_verifications').update({ attempts: verification.attempts + 1 }).eq('id', verification.id);
      const remaining = 5 - (verification.attempts + 1);
      throw new ValidationError(remaining > 0 ? `Invalid reset code. ${remaining} attempt(s) remaining.` : 'No attempts remaining. Please request a new code.');
    }

    // Mark verified so it can be used as a resetToken
    await supabase.from('email_verifications').update({ verified: true }).eq('id', verification.id);

    return res.json({
      message: 'Code verified. You may now set a new password.',
      resetToken: verification.id,
      email,
    });
  } catch (error) { next(error); }
});

// ─── STEP 3: Reset password — new password + confirm password ────────────────
router.post('/password/reset', authValidators.resetPassword, validate, async (req, res, next) => {
  try {
    const { resetToken, password } = req.body;
    // confirmPassword match is enforced by the validator

    const { data: verification, error: fetchError } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('id', resetToken)
      .eq('verified', true)
      .maybeSingle();
    if (fetchError) throw fetchError;

    if (!verification) throw new ValidationError('Invalid or expired reset token. Please start the reset process again.');
    if (isOTPExpired(verification.expires_at)) throw new ValidationError('Reset session has expired. Please request a new code.');

    if (!supabaseAdmin) throw new AppError('Password reset requires SUPABASE_SERVICE_ROLE_KEY to be configured.', 503, 'ADMIN_UNAVAILABLE');

    const { data: { users }, error: lookupError } = await supabaseAdmin.auth.admin.listUsers();
    if (lookupError) throw lookupError;

    const authUser = users?.find((u) => u.email === verification.email);
    if (!authUser) throw new NotFoundError('Account not found.');

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, { password });
    if (updateError) throw updateError;

    // Burn token — expire it so it can never be reused
    await supabase.from('email_verifications').update({ expires_at: new Date().toISOString() }).eq('id', resetToken);

    sendPasswordChangedEmail(verification.email).catch((e) => console.error('[Email] Password changed email failed:', e.message));

    return res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) { next(error); }
});

export default router;
