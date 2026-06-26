import express from 'express';
import { createClient } from '@supabase/supabase-js';
import supabase, { supabaseAdmin, getSupabaseAdmin } from '../config/supabase.js';
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
import { success } from '../utils/response.js';

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

// True if a Supabase Auth error means "this email is already taken".
const isEmailExistsError = (err) => {
  if (!err) return false;
  const code = (err.code || '').toLowerCase();
  const msg = (err.message || '').toLowerCase();
  return (
    code === 'email_exists' ||
    code === 'email_address_already_exists' ||
    msg.includes('already been registered') ||
    msg.includes('already registered') ||
    msg.includes('already exists')
  );
};

// Returns true if `email` already belongs to a registered account.
// Checks user_profiles first (fast — covers fully onboarded users), then
// falls back to Supabase Auth (covers "orphaned" auth users whose profile
// row was never created). Never throws — failures are logged and treated as
// "not found" so a transient lookup error can't block a legitimate signup.
const emailAlreadyRegistered = async (email) => {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle();
    if (profileError) {
      console.error('[emailAlreadyRegistered] profile lookup error:', profileError.message);
    }
    if (profile) return true;
  } catch (e) {
    console.error('[emailAlreadyRegistered] profile lookup threw:', e.message);
  }

  const admin = getSupabaseAdmin();
  if (admin) {
    try {
      const lower = email.toLowerCase();
      const perPage = 1000;
      for (let page = 1; page <= 10; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
        if (error) {
          console.error('[emailAlreadyRegistered] listUsers error:', error.message);
          break;
        }
        const users = data?.users || [];
        if (users.some((u) => (u.email || '').toLowerCase() === lower)) return true;
        if (users.length < perPage) break; // last page reached
      }
    } catch (e) {
      console.error('[emailAlreadyRegistered] auth fallback failed:', e.message);
    }
  }

  return false;
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
    return success(res, { exists: data !== null, flow: data ? 'login' : 'register' });
  } catch (error) { next(error); }
});

router.post('/email/send-otp', authValidators.email, validate, async (req, res, next) => {
  try {
    const { email } = req.body;

    // Onboarding OTP is only for NEW users. If this email already belongs to
    // an account, stop here and tell the app to route the user to login.
    if (await emailAlreadyRegistered(email)) {
      throw new AppError(
        'An account with this email already exists. Please log in instead.',
        409,
        'EMAIL_EXISTS'
      );
    }

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
    return success(res, { message: 'Verification code sent to your email', verificationId: verification.id });
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
    return success(res, { message: 'Email verified successfully', verified: true, email });
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
    return success(res, { message: 'A new verification code has been sent to your email', verificationId: verification.id });
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

    if (await emailAlreadyRegistered(email)) {
      throw new AppError(
        'An account with this email already exists. Please log in instead.',
        409,
        'EMAIL_EXISTS'
      );
    }

    let user, session;

    if (supabaseAdmin) {
      const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { email_verified: true },
      });
      if (adminError) {
        if (isEmailExistsError(adminError)) {
          throw new AppError('An account with this email already exists. Please log in instead.', 409, 'EMAIL_EXISTS');
        }
        throw adminError;
      }
      user = adminData?.user;
      const { error: profileError } = await supabaseAdmin.from('user_profiles').insert({ id: user.id, email, onboarding_completed: false });
      if (profileError) throw profileError;
    } else {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password, options: { data: { email_verified: true } } });
      if (signUpError) {
        if (isEmailExistsError(signUpError)) throw new AppError('An account with this email already exists. Please log in instead.', 409, 'EMAIL_EXISTS');
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

    return success(res, {
      message: 'Account created successfully',
      user: { id: user.id, email: user.email, createdAt: user.created_at },
      session: session ? { accessToken: session.access_token, refreshToken: session.refresh_token, expiresAt: session.expires_at } : null,
    }, 201);
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

    return success(res, {
      message: 'Logged in successfully',
      user: { id: authData.user.id, email: authData.user.email, createdAt: authData.user.created_at },
      session: { accessToken: authData.session.access_token, refreshToken: authData.session.refresh_token, expiresAt: authData.session.expires_at },
    });
  } catch (error) { next(error); }
});

router.post('/token/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return next(new AppError('Refresh token is required.', 400, 'MISSING_REFRESH_TOKEN'));
    }
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data?.session) {
      // Always return 401 with a clear code — never return null/empty silently
      return next(new AppError(
        'Refresh token is invalid or expired. Please log in again.',
        401,
        'REFRESH_TOKEN_EXPIRED'
      ));
    }
    return success(res, {
      message: 'Token refreshed successfully',
      session: {
        accessToken:  data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt:    data.session.expires_at,
      },
    });
  } catch (error) { next(error); }
});

router.post('/logout', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) await supabase.auth.signOut();
    return success(res, { message: 'Logged out successfully' });
  } catch (error) { next(error); }
});

router.post('/password/forgot', authValidators.email, validate, async (req, res, next) => {
  // Generic response sent back to the client whether or not the email matches
  // an account. This intentionally prevents email enumeration. All branching
  // (account exists / doesn't exist / email-send failed) is logged
  // server-side so it can be debugged from Vercel / Render logs without
  // leaking information to the caller.
  const genericResponse = {
    message: 'If an account with this email exists, a 6-digit reset code has been sent to your email.',
  };

  try {
    const { email } = req.body;
    console.log(`[forgot-password] Request received for email="${email}"`);

    // ─── Step 1: Find the account ──────────────────────────────────────────
    // Earlier versions only checked `user_profiles` with `.eq('email', email)`,
    // which silently skipped sending the OTP whenever:
    //   • the email was stored with different casing (e.g. "User@Gmail.com");
    //   • the user existed in `auth.users` but no profile row was created
    //     (e.g. signup was interrupted before the profile insert);
    //   • Postgres' default collation produced no match for any other reason.
    // The user saw `{ status: "success", ... }` but never received an email.
    //
    // We now do a case-insensitive `ilike` lookup AND, if that misses, fall
    // back to the Supabase Auth admin user list. Either match is enough.

    let accountFound = false;
    let resolvedEmail = email; // what we'll write to the OTP row + send to

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('email')
      .ilike('email', email)
      .maybeSingle();

    if (profileError) {
      console.error('[forgot-password] user_profiles lookup error:', profileError.message);
    }
    if (profile) {
      accountFound = true;
      resolvedEmail = profile.email; // use the stored casing
      console.log(`[forgot-password] Profile match in user_profiles for "${resolvedEmail}"`);
    } else if (supabaseAdmin) {
      // Fallback: maybe the user exists in auth.users but not in user_profiles.
      try {
        const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
        if (listErr) {
          console.error('[forgot-password] auth.admin.listUsers error:', listErr.message);
        } else {
          const lower = email.toLowerCase();
          const authUser = (users || []).find((u) => (u.email || '').toLowerCase() === lower);
          if (authUser) {
            accountFound = true;
            resolvedEmail = authUser.email || email;
            console.log(`[forgot-password] Profile missing but auth.users match for "${resolvedEmail}"`);
          }
        }
      } catch (e) {
        console.error('[forgot-password] auth fallback failed:', e.message);
      }
    }

    if (!accountFound) {
      console.log(`[forgot-password] No account found for "${email}" — returning generic response`);
      return success(res, genericResponse);
    }

    // ─── Step 2: Invalidate previous unverified codes ──────────────────────
    const adminClient = supabaseAdmin || supabase;
    const { error: invalidateError } = await adminClient
      .from('email_verifications')
      .update({ attempts: 99 })
      .ilike('email', resolvedEmail)
      .eq('verified', false);
    if (invalidateError) {
      console.error('[forgot-password] invalidate previous codes error:', invalidateError.message);
    }

    // ─── Step 3: Create the OTP row ────────────────────────────────────────
    const otpCode   = generateOTP();
    const expiresAt = getOTPExpiryTime();

    const { error: insertError } = await adminClient
      .from('email_verifications')
      .insert({
        email:      resolvedEmail,
        otp_code:   otpCode,
        expires_at: expiresAt,
        verified:   false,
        attempts:   0,
      });
    if (insertError) {
      console.error('[forgot-password] OTP insert FAILED:', JSON.stringify(insertError));
      // Don't reveal to the client — they get the generic response.
      return success(res, genericResponse);
    }

    // ─── Step 4: Send the email ────────────────────────────────────────────
    try {
      await sendPasswordResetOTPEmail(resolvedEmail, otpCode);
      console.log(`[forgot-password] OTP sent to "${resolvedEmail}"`);
    } catch (mailErr) {
      console.error(`[forgot-password] sendPasswordResetOTPEmail FAILED for "${resolvedEmail}":`, mailErr.message);
      // We still return success so behaviour for the client matches the
      // not-found path. The error is in the logs for the operator.
    }

    return success(res, genericResponse);
  } catch (error) {
    // Unexpected failure — log and still return the generic response so we
    // don't leak account existence through error shape.
    console.error('[forgot-password] Unhandled error:', error?.message || error);
    return success(res, genericResponse);
  }
});

router.post('/password/verify-code', authValidators.verifyResetCode, validate, async (req, res, next) => {
  try {
    const { email, code } = req.body;

    const { data: verification, error: fetchError } = await supabase
      .from('email_verifications')
      .select('*')
      .ilike('email', email)
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

    await supabase.from('email_verifications').update({ verified: true }).eq('id', verification.id);

    return success(res, {
      message: 'Code verified. You may now set a new password.',
      resetToken: verification.id,
      email,
    });
  } catch (error) { next(error); }
});

router.post('/password/reset', authValidators.resetPassword, validate, async (req, res, next) => {
  try {
    const { resetToken, password } = req.body;
   

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

    const authUser = users?.find((u) => (u.email || '').toLowerCase() === (verification.email || '').toLowerCase());
    if (!authUser) throw new NotFoundError('Account not found.');

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, { password });
    if (updateError) throw updateError;

    await supabase.from('email_verifications').update({ expires_at: new Date().toISOString() }).eq('id', resetToken);

    sendPasswordChangedEmail(verification.email).catch((e) => console.error('[Email] Password changed email failed:', e.message));

    return success(res, { message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) { next(error); }
});

export default router;
