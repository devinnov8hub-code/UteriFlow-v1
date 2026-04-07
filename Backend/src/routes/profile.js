/**
 * User profile management routes
 * Mounted at /api/v1/profile
 */
import express from 'express';
import supabase from '../config/supabase.js';
import { authenticateUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { profileValidators } from '../validators/index.js';
import { NotFoundError } from '../errors/index.js';
import { success } from '../utils/response.js';

const router = express.Router();
router.use(authenticateUser);

// ─── Get own profile (full) ───────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', req.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('Profile not found');

    // Post count
    const { count: postCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', req.user.id);

    // Bookmark count
    const { count: bookmarkCount } = await supabase
      .from('post_bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    return success(res, {
      profile: {
        ...data,
        stats: {
          postsCount:     postCount ?? 0,
          bookmarksCount: bookmarkCount ?? 0,
        },
      },
    });
  } catch (error) { next(error); }
});

// ─── Update own profile ───────────────────────────────────────
router.patch('/', profileValidators.update, validate, async (req, res, next) => {
  try {
    const allowed = {
      displayName:       'display_name',
      bio:               'bio',
      avatarUrl:         'avatar_url',
      cycleLengthAvg:    'cycle_length_avg',
      periodLengthAvg:   'period_length_avg',
      notificationPref:  'notification_pref',
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

// ─── Get public profile by user id ───────────────────────────
// Used when viewing another user's profile from community posts
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
