
import express from 'express';
import supabase from '../config/supabase.js';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticateUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { profileValidators } from '../validators/index.js';
import { body } from 'express-validator';
import { NotFoundError, AppError, ValidationError } from '../errors/index.js';
import { success } from '../utils/response.js';
import { createClient } from '@supabase/supabase-js';
import { mapPcosToHormonal } from '../utils/cycleEngine.js';

const router = express.Router();
router.use(authenticateUser);
router.get('/', async (req, res, next) => {
  try {
    let { data, error } = await req.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', req.user.id)
      .maybeSingle();
    if (error) throw error;

    // Self-heal: some accounts (e.g. created directly in Supabase, or where an
    // early signup was interrupted before the profile insert) have an auth user
    // but NO user_profiles row. Previously this 404'd every time the user opened
    // their profile screen ("works for some users but not others"). Create the
    // missing row on the fly from the verified JWT, then continue.
    if (!data) {
      const { data: created, error: createErr } = await req.supabase
        .from('user_profiles')
        .upsert(
          { id: req.user.id, email: req.user.email, onboarding_completed: false },
          { onConflict: 'id' },
        )
        .select()
        .maybeSingle();
      if (createErr) throw createErr;
      data = created;
    }
    if (!data) throw new NotFoundError('Profile not found');

    const [
      { count: postCount },
      { count: bookmarkCount },
      { count: commentCount },
      { count: likeCount },
    ] = await Promise.all([
      req.supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', req.user.id),
      req.supabase.from('post_bookmarks').select('*', { count: 'exact', head: true }).eq('user_id', req.user.id),
      req.supabase.from('comments').select('*', { count: 'exact', head: true }).eq('author_id', req.user.id),
      req.supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('user_id', req.user.id),
    ]);

    return success(res, {
      profile: {
        ...data,
        stats: {
          postsCount:     postCount     ?? 0,
          commentsCount:  commentCount  ?? 0,
          likesCount:     likeCount     ?? 0,
          bookmarksCount: bookmarkCount ?? 0,
        },
      },
    });
  } catch (error) { next(error); }
});


router.patch('/', profileValidators.update, validate, async (req, res, next) => {
  try {
    const allowed = {
      displayName:      'display_name',
      bio:              'bio',
      avatarUrl:        'avatar_url',
      cycleLengthAvg:   'cycle_length_avg',
      periodLengthAvg:  'period_length_avg',
      notificationPref: 'notification_pref',
    };

    const updates = {};
    for (const [jsKey, dbKey] of Object.entries(allowed)) {
      if (req.body[jsKey] !== undefined) updates[dbKey] = req.body[jsKey];
    }

    // PRD-canonical "Settings" fields (validated in profileValidators.update but
    // previously dropped because they weren't in the `allowed` map above).
    //
    // pcosStatus keeps the legacy `hormonal_status` column in sync, and snaps
    // `pcos_tier` to 'confirmed' when the user self-declares confirmed PCOS — the
    // same dual-write the onboarding endpoints do.
    if (req.body.pcosStatus !== undefined) {
      updates.pcos_status     = req.body.pcosStatus;
      updates.hormonal_status = mapPcosToHormonal(req.body.pcosStatus);
      if (req.body.pcosStatus === 'confirmed') updates.pcos_tier = 'confirmed';
    }
    // contraceptiveType also stamps contraceptive_changed_at so the engine can
    // date-bound which cycles are representative after a method change.
    if (req.body.contraceptiveType !== undefined) {
      updates.contraceptive_type       = req.body.contraceptiveType;
      updates.contraceptive_changed_at = new Date().toISOString();
    }

    if (Object.keys(updates).length === 0)
      return success(res, { message: 'No changes provided' });

    // Upsert (not bare update) so the change still persists for accounts whose
    // user_profiles row is missing — a plain UPDATE matches zero rows there and
    // silently "doesn't update". `id` + `email` come from the verified JWT.
    const { data, error } = await req.supabase
      .from('user_profiles')
      .upsert(
        { id: req.user.id, email: req.user.email, ...updates },
        { onConflict: 'id' },
      )
      .select()
      .maybeSingle();
    if (error) throw error;

    return success(res, { message: 'Profile updated successfully', profile: data });
  } catch (error) { next(error); }
});


router.post('/change-password', [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/\d/).withMessage('Password must contain at least one number')
    .matches(/[a-zA-Z]/).withMessage('Password must contain at least one letter'),
  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your new password')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) throw new Error('Passwords do not match');
      return true;
    }),
], validate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email:    req.user.email,
      password: currentPassword,
    });
    if (signInError) {
      throw new ValidationError('Current password is incorrect');
    }

   
    if (!supabaseAdmin?.auth) {
      throw new AppError('Password change requires SUPABASE_SERVICE_ROLE_KEY to be configured.', 503, 'ADMIN_UNAVAILABLE');
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      req.user.id,
      { password: newPassword }
    );
    if (updateError) throw updateError;

    return success(res, { message: 'Password changed successfully. Please log in again with your new password.' });
  } catch (error) { next(error); }
});


router.delete('/account', [
  body('password').notEmpty().withMessage('Password is required to confirm account deletion'),
], validate, async (req, res, next) => {
  try {
    const { password } = req.body;

    
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email:    req.user.email,
      password,
    });
    if (signInError) {
      throw new ValidationError('Incorrect password. Account deletion cancelled.');
    }

    if (!supabaseAdmin?.auth) {
      throw new AppError('Account deletion requires SUPABASE_SERVICE_ROLE_KEY.', 503, 'ADMIN_UNAVAILABLE');
    }

    
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(req.user.id);
    if (deleteError) throw deleteError;

    return success(res, { message: 'Account and all associated data have been permanently deleted.' });
  } catch (error) { next(error); }
});


router.get('/export-data', async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [
      { data: profile },
      { data: periodLogs },
      { data: symptoms },
      { data: predictions },
      { data: posts },
      { data: comments },
      { data: notifications },
    ] = await Promise.all([
      req.supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle(),
      req.supabase.from('period_logs').select('*').eq('user_id', userId).order('start_date', { ascending: true }),
      req.supabase.from('period_symptoms').select('*').eq('user_id', userId).order('logged_date', { ascending: true }),
      req.supabase.from('cycle_predictions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      req.supabase.from('posts').select('id,title,content,category,created_at').eq('author_id', userId),
      req.supabase.from('comments').select('id,content,post_id,created_at').eq('author_id', userId),
      req.supabase.from('notifications').select('*').eq('user_id', userId),
    ]);

    return success(res, {
      exportedAt: new Date().toISOString(),
      data: {
        profile,
        periodLogs:      periodLogs      ?? [],
        symptoms:        symptoms        ?? [],
        predictions:     predictions     ?? [],
        posts:           posts           ?? [],
        comments:        comments        ?? [],
        notifications:   notifications   ?? [],
      },
    });
  } catch (error) { next(error); }
});
router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from('user_profiles')
      .select('id, display_name, avatar_url, bio, created_at')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('User not found');

    const { count: postCount } = await req.supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', req.params.id)
      .eq('is_published', true);

    return success(res, { profile: { ...data, postsCount: postCount ?? 0 } });
  } catch (error) { next(error); }
});

export default router;
