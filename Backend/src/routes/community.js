import express from 'express';
import { supabaseAdmin, getSupabaseAdmin } from '../config/supabase.js';
import { requireAdmin } from '../middleware/admin.js';
import { validate } from '../middleware/validate.js';
import { body, param, query } from 'express-validator';
import { AppError, NotFoundError } from '../errors/index.js';
import { success } from '../utils/response.js';

const router = express.Router();

router.use((req, res, next) => {
  if (!getSupabaseAdmin()) {
    return res.status(503).json({
      error: 'SUPABASE_SERVICE_ROLE_KEY is missing from backend .env',
      code: 'ADMIN_UNAVAILABLE',
    });
  }
  next();
});

router.use(requireAdmin);

const paginationV = [
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
];
const uuidParam = [param('id').isUUID().withMessage('Invalid ID')];

router.get('/posts', [
  ...paginationV,
  query('category').optional().isIn(['community', 'lifestyle_tips', 'discord', 'flagged']),
  query('search').optional().trim().isLength({ max: 200 }),
], validate, async (req, res, next) => {
  try {
    const limit = req.query.limit ?? 20;
    const offset = req.query.offset ?? 0;
    const { category, search } = req.query;

    let q = supabaseAdmin
      .from('posts')
      .select(`*`, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category === 'flagged') {
      q = q.eq('is_flagged', true);
    } else if (category) {
      q = q.eq('category', category);
    }

    if (search) {
      q = q.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { data, count, error } = await q;
    if (error) throw error;

    return success(res, { posts: data, pagination: { total: count, limit, offset, returned: data.length } });
  } catch (error) { next(error); }
});

router.get('/posts/:id', uuidParam, validate, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('posts')
      .select(`*`)
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('Post not found');

    const { count } = await supabaseAdmin.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', req.params.id);
    return success(res, { post: { ...data, commentCount: count } });
  } catch (error) { next(error); }
});

router.post('/posts', [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('content').trim().notEmpty().withMessage('Content is required'),
  body('category').isIn(['community', 'lifestyle_tips', 'discord']).withMessage('Invalid category'),
  body('image_url').optional({ nullable: true }).isURL(),
], validate, async (req, res, next) => {
  try {
    const { title, content, category, image_url } = req.body;

    const insertPayload = {
      title,
      content,
      category,
      image_url: image_url || null,
      author_id: req.user.id,
    };

    const { data, error } = await supabaseAdmin
      .from('posts')
      .insert(insertPayload)
      .select()
      .single();
    if (error) throw error;
    return success(res, { message: 'Post created successfully', post: data }, 201);
  } catch (error) { next(error); }
});

router.patch('/posts/:id', [...uuidParam,
  body('title').optional().trim().isLength({ max: 200 }),
  body('content').optional().trim().notEmpty(),
  body('is_flagged').optional().isBoolean(),
  body('is_published').optional().isBoolean(),
], validate, async (req, res, next) => {
  try {
    const allowed = ['title', 'content', 'image_url', 'is_flagged', 'is_published'];
    const updates = {};
    for (const f of allowed) if (req.body[f] !== undefined) updates[f] = req.body[f];
    if (!Object.keys(updates).length) throw new AppError('No fields to update', 400, 'NO_FIELDS');

    const { data, error } = await supabaseAdmin.from('posts').update(updates).eq('id', req.params.id).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('Post not found');
    return success(res, { message: 'Post updated', post: data });
  } catch (error) { next(error); }
});

router.delete('/posts/:id', uuidParam, validate, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('posts').delete().eq('id', req.params.id).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('Post not found');
    return success(res, { message: 'Post deleted successfully' });
  } catch (error) { next(error); }
});

router.get('/posts/:id/comments', [...uuidParam, ...paginationV], validate, async (req, res, next) => {
  try {
    const limit = req.query.limit ?? 50;
    const offset = req.query.offset ?? 0;

    const { data, count, error } = await supabaseAdmin
      .from('comments')
      .select(`*`, { count: 'exact' })
      .eq('post_id', req.params.id)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return success(res, { comments: data, pagination: { total: count, limit, offset } });
  } catch (error) { next(error); }
});

router.delete('/comments/:id', uuidParam, validate, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('comments').delete().eq('id', req.params.id).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('Comment not found');
    return success(res, { message: 'Comment deleted successfully' });
  } catch (error) { next(error); }
});

router.patch('/comments/:id/flag', uuidParam, validate, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('comments').update({ is_flagged: true }).eq('id', req.params.id).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('Comment not found');
    return success(res, { message: 'Comment flagged', comment: data });
  } catch (error) { next(error); }
});

router.get('/analytics', [
  query('days').optional().isInt({ min: 1, max: 365 }).toInt(),
], validate, async (req, res, next) => {
  try {
    const days = req.query.days ?? 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [postsResult, commentsResult, usersResult, flaggedPostsResult, flaggedCommentsResult] = await Promise.all([
      supabaseAdmin.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', since),
      supabaseAdmin.from('comments').select('*', { count: 'exact', head: true }).gte('created_at', since),
      supabaseAdmin.from('user_profiles').select('*', { count: 'exact', head: true }).gte('created_at', since),
      supabaseAdmin.from('posts').select('*', { count: 'exact', head: true }).eq('is_flagged', true),
      supabaseAdmin.from('comments').select('*', { count: 'exact', head: true }).eq('is_flagged', true),
    ]);


    const weeklyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(Date.now() - i * 86400000);
      const dayEnd = new Date(Date.now() - (i - 1) * 86400000);
      dayStart.setHours(0, 0, 0, 0);
      dayEnd.setHours(0, 0, 0, 0);

      const { count: dayPosts } = await supabaseAdmin.from('posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dayStart.toISOString())
        .lt('created_at', dayEnd.toISOString());

      const { count: dayComments } = await supabaseAdmin.from('comments')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dayStart.toISOString())
        .lt('created_at', dayEnd.toISOString());

      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      weeklyActivity.push({ day: days[dayStart.getDay()], posts: dayPosts || 0, comments: dayComments || 0 });
    }

    return success(res, {
      period: `${days} days`,
      stats: {
        postsPublished: postsResult.count || 0,
        comments: commentsResult.count || 0,
        activeUsers: usersResult.count || 0,
        flaggedPosts: flaggedPostsResult.count || 0,
        flaggedComments: flaggedCommentsResult.count || 0,
      },
      weeklyActivity,
    });
  } catch (error) { next(error); }
});

router.post('/users/:id/ban', [...uuidParam,
  body('ban_type').isIn(['temporary', 'permanent']).withMessage('ban_type must be temporary or permanent'),
  body('reason').optional().trim().isLength({ max: 500 }),
  body('days').optional().isInt({ min: 1, max: 365 }).toInt(),
], validate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ban_type, reason, days } = req.body;

    const { data: profile } = await supabaseAdmin.from('user_profiles').select('id, email').eq('id', id).maybeSingle();
    if (!profile) throw new NotFoundError('User not found');

    const banned_until = ban_type === 'temporary' && days
      ? new Date(Date.now() + days * 86400000).toISOString()
      : null;

    const { data, error } = await supabaseAdmin.from('user_bans').insert({
      user_id: id,
      banned_by: req.user.id,
      reason: reason || null,
      ban_type,
      banned_until,
    }).select().single();

    if (error) throw error;
    return success(res, { message: `User ${ban_type === 'permanent' ? 'permanently' : 'temporarily'} banned`, ban: data }, 201);
  } catch (error) { next(error); }
});

router.delete('/users/:id/ban', uuidParam, validate, async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin.from('user_bans').delete().eq('user_id', req.params.id);
    if (error) throw error;
    return success(res, { message: 'User unbanned successfully' });
  } catch (error) { next(error); }
});

export default router;
