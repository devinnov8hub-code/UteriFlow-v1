
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

const router = express.Router();
router.use(authenticateUser);
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', req.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('Profile not found');

    const [
      { count: postCount },
      { count: bookmarkCount },
      { count: commentCount },
      { count: likeCount },
    ] = await Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', req.user.id),
      supabase.from('post_bookmarks').select('*', { count: 'exact', head: true }).eq('user_id', req.user.id),
      supabase.from('comments').select('*', { count: 'exact', head: true }).eq('author_id', req.user.id),
      supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('user_id', req.user.id),
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

    if (Object.keys(updates).length === 0)
      return success(res, { message: 'No changes provided' });

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', req.user.id)
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
      supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('period_logs').select('*').eq('user_id', userId).order('start_date', { ascending: true }),
      supabase.from('period_symptoms').select('*').eq('user_id', userId).order('logged_date', { ascending: true }),
      supabase.from('cycle_predictions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('posts').select('id,title,content,category,created_at').eq('author_id', userId),
      supabase.from('comments').select('id,content,post_id,created_at').eq('author_id', userId),
      supabase.from('notifications').select('*').eq('user_id', userId),
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
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, display_name, avatar_url, bio, created_at')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('User not found');

    const { count: postCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', req.params.id)
      .eq('is_published', true);

    return success(res, { profile: { ...data, postsCount: postCount ?? 0 } });
  } catch (error) { next(error); }
});

export default router;
