import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAdmin } from '../middleware/admin.js';
import { validate } from '../middleware/validate.js';
import { body, param, query } from 'express-validator';
import { AppError, NotFoundError } from '../errors/index.js';
import { success } from '../utils/response.js';
import { rangeOrEmpty } from '../utils/pagination.js';
import { sendPushToUsers } from '../utils/push.js';

const router = express.Router();
router.use(requireAdmin);

const paginationValidators = [
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
];
const uuidParam = [param('id').isUUID().withMessage('Invalid ID')];


router.get('/stats', async (req, res, next) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: totalUsers,       error: e1 },
      { count: onboardedUsers,   error: e2 },
      { count: totalPeriodLogs,  error: e3 },
      { count: newUsersWeek,     error: e4 },
      { data:  hormonalBreakdown,error: e5 },
      { data:  ageBreakdown,     error: e6 },
      { count: totalPosts,       error: e7 },
      { count: flaggedPosts,     error: e8 },
      { count: activeBans,       error: e9 },
    ] = await Promise.all([
      supabaseAdmin.from('user_profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('user_profiles').select('*', { count: 'exact', head: true }).eq('onboarding_completed', true),
      supabaseAdmin.from('period_logs').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('user_profiles').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
      supabaseAdmin.from('user_profiles').select('hormonal_status'),
      supabaseAdmin.from('user_profiles').select('age_group'),
      supabaseAdmin.from('posts').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('posts').select('*', { count: 'exact', head: true }).eq('is_flagged', true),
      supabaseAdmin.from('user_bans').select('*', { count: 'exact', head: true }),
    ]);

    for (const e of [e1,e2,e3,e4,e5,e6,e7,e8,e9]) if (e) throw e;

    const hormonalCounts = (hormonalBreakdown ?? []).reduce((acc, { hormonal_status }) => {
      const key = hormonal_status || 'not_set';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const ageCounts = (ageBreakdown ?? []).reduce((acc, { age_group }) => {
      const key = age_group || 'not_set';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return success(res, {
      overview: {
        totalUsers,
        onboardedUsers,
        onboardingRate: totalUsers > 0 ? ((onboardedUsers / totalUsers) * 100).toFixed(1) + '%' : '0%',
        newUsersLast7Days: newUsersWeek,
        totalPeriodLogs,
        totalPosts,
        flaggedPosts,
        activeBans,
      },
      breakdowns: { hormonalStatus: hormonalCounts, ageGroup: ageCounts },
    });
  } catch (error) { next(error); }
});

router.get('/users', [
  ...paginationValidators,
  query('search').optional().trim().isLength({ max: 100 }),
  query('onboarding_completed').optional().isBoolean().toBoolean(),
  query('banned').optional().isBoolean().toBoolean(),
], validate, async (req, res, next) => {
  try {
    const limit  = req.query.limit  ?? 20;
    const offset = req.query.offset ?? 0;
    const { search, onboarding_completed } = req.query;

    const applyFilters = (qb) => {
      if (search)                             qb = qb.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
      if (onboarding_completed !== undefined) qb = qb.eq('onboarding_completed', onboarding_completed);
      return qb;
    };

    const dataQuery = applyFilters(
      supabaseAdmin.from('user_profiles').select('*', { count: 'exact' })
    )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { rows: data, total: count } = await rangeOrEmpty(dataQuery, () =>
      applyFilters(supabaseAdmin.from('user_profiles').select('id', { count: 'exact', head: true }))
    );

    const userIds = data.map(u => u.id);
    const { data: bans } = userIds.length
      ? await supabaseAdmin
          .from('user_bans')
          .select('user_id, ban_type, banned_until')
          .in('user_id', userIds)
      : { data: [] };

    const banMap = {};
    for (const b of (bans ?? [])) banMap[b.user_id] = b;

    const users = data.map(u => ({
      ...u,
      ban: banMap[u.id] ?? null,
    }));

    return success(res, { users, pagination: { total: count, limit, offset, returned: users.length } });
  } catch (error) { next(error); }
});


router.get('/users/:id', uuidParam, validate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [
      { data: profile, error: profileError },
      { count: periodCount },
      { count: postCount },
      { data: ban },
    ] = await Promise.all([
      supabaseAdmin.from('user_profiles').select('*').eq('id', id).maybeSingle(),
      supabaseAdmin.from('period_logs').select('*', { count: 'exact', head: true }).eq('user_id', id),
      supabaseAdmin.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', id),
      supabaseAdmin.from('user_bans').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    if (profileError) throw profileError;
    if (!profile) throw new NotFoundError('User not found');

    return success(res, {
      user: { ...profile, periodLogCount: periodCount, postCount, ban: ban ?? null },
    });
  } catch (error) { next(error); }
});


router.patch('/users/:id', [
  ...uuidParam,
  body('display_name').optional().trim().isLength({ min: 1, max: 50 }),
  body('age_group').optional().isIn(['18-24','25-29','30-34','35-39','40-44','45+']),
  body('hormonal_status').optional().isIn(['diagnosed','suspected','not_sure','no']),
  body('period_regularity').optional().isIn(['regular','varies_week','unpredictable','not_tracked']),
  body('onboarding_completed').optional().isBoolean(),
], validate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const allowedFields = ['display_name','age_group','hormonal_status','period_regularity','health_focus','onboarding_completed'];
    const updates = {};
    for (const f of allowedFields) if (req.body[f] !== undefined) updates[f] = req.body[f];
    if (!Object.keys(updates).length) throw new AppError('No valid fields provided for update', 400, 'NO_FIELDS');

    const { data, error } = await supabaseAdmin.from('user_profiles').update(updates).eq('id', id).select().maybeSingle();
    if (error) throw error;
    if (!data)  throw new NotFoundError('User not found');

    return success(res, { message: 'User profile updated successfully', user: data });
  } catch (error) { next(error); }
});


router.delete('/users/:id', uuidParam, validate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: profile, error: checkError } = await supabaseAdmin.from('user_profiles').select('id,email').eq('id', id).maybeSingle();
    if (checkError) throw checkError;
    if (!profile)   throw new NotFoundError('User not found');

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (deleteError) throw deleteError;

    return success(res, { message: 'User deleted successfully', deleted: { id: profile.id, email: profile.email } });
  } catch (error) { next(error); }
});


router.post('/users/:id/grant-admin', uuidParam, validate, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(req.params.id, { user_metadata: { is_admin: true } });
    if (error) throw error;
    if (!data?.user) throw new NotFoundError('User not found');
    return success(res, { message: 'Admin privileges granted', userId: req.params.id });
  } catch (error) { next(error); }
});

router.post('/users/:id/revoke-admin', uuidParam, validate, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(req.params.id, { user_metadata: { is_admin: false } });
    if (error) throw error;
    if (!data?.user) throw new NotFoundError('User not found');
    return success(res, { message: 'Admin privileges revoked', userId: req.params.id });
  } catch (error) { next(error); }
});


router.get('/period-logs', [
  ...paginationValidators,
  query('user_id').optional().isUUID().withMessage('Invalid user_id'),
], validate, async (req, res, next) => {
  try {
    const limit  = req.query.limit  ?? 20;
    const offset = req.query.offset ?? 0;
    const { user_id } = req.query;

    const applyFilters = (qb) => {
      if (user_id) qb = qb.eq('user_id', user_id);
      return qb;
    };

    const dataQuery = applyFilters(
      supabaseAdmin.from('period_logs').select('*', { count: 'exact' })
    )
      .order('start_date', { ascending: false })
      .range(offset, offset + limit - 1);

    const { rows, total } = await rangeOrEmpty(dataQuery, () =>
      applyFilters(supabaseAdmin.from('period_logs').select('id', { count: 'exact', head: true }))
    );

    return success(res, { periodLogs: rows, pagination: { total, limit, offset, returned: rows.length } });
  } catch (error) { next(error); }
});

router.delete('/period-logs/:id', uuidParam, validate, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('period_logs').delete().eq('id', req.params.id).select().maybeSingle();
    if (error) throw error;
    if (!data)  throw new NotFoundError('Period log not found');
    return success(res, { message: 'Period log deleted successfully', deleted: { id: data.id } });
  } catch (error) { next(error); }
});


router.post('/users/:id/ban', [...uuidParam,
  body('ban_type').isIn(['temporary','permanent']).withMessage('ban_type must be temporary or permanent'),
  body('reason').optional().trim().isLength({ max: 500 }),
  body('days').optional().isInt({ min: 1, max: 365 }).toInt(),
], validate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ban_type, reason, days } = req.body;

    const { data: profile } = await supabaseAdmin.from('user_profiles').select('id,email').eq('id', id).maybeSingle();
    if (!profile) throw new NotFoundError('User not found');

    
    await supabaseAdmin.from('user_bans').delete().eq('user_id', id);

    const banned_until = ban_type === 'temporary' && days
      ? new Date(Date.now() + days * 86400000).toISOString()
      : null;

    const { data, error } = await supabaseAdmin.from('user_bans').insert({
      user_id:     id,
      banned_by:   req.user.id,
      reason:      reason || null,
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


router.post('/notifications/broadcast', [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('body').trim().notEmpty().withMessage('Body is required'),
  body('type').isIn(['tip','system']).withMessage('type must be tip or system'),
  body('userIds').optional().isArray().withMessage('userIds must be an array of UUIDs'),
], validate, async (req, res, next) => {
  try {
    const { title, body: bodyText, type, userIds } = req.body;

    let targets = userIds;
    if (!targets || targets.length === 0) {
     
      const { data: profiles } = await supabaseAdmin.from('user_profiles').select('id');
      targets = (profiles ?? []).map(p => p.id);
    }

    const rows = targets.map(uid => ({ user_id: uid, type, title, body: bodyText }));

    const { error } = await supabaseAdmin.from('notifications').insert(rows);
    if (error) throw error;

    // Best-effort push to all targeted users' devices. Never let a push failure
    // fail the request — the in-app notification has already been saved above.
    let push = { sent: 0, failed: 0, skipped: true };
    try {
      push = await sendPushToUsers(supabaseAdmin, targets, {
        title,
        body: bodyText,
        data: { type, kind: 'broadcast' },
      });
    } catch (e) {
      console.warn('[admin/broadcast] push failed:', e.message);
    }

    return success(res, {
      message: `Notification sent to ${targets.length} user(s)`,
      push,
    });
  } catch (error) { next(error); }
});


// ════════════════════════════════════════════════════════════════════════════
// Landing-page lead inboxes
//
// The public landing site posts to /api/v1/landing/{newsletter,waitlist}.
// Admins read and curate that data through the endpoints below.
// ════════════════════════════════════════════════════════════════════════════

// ─── Newsletter subscribers ────────────────────────────────────────────────
router.get('/newsletter', [
  ...paginationValidators,
  query('search').optional().trim().isLength({ max: 100 }),
], validate, async (req, res, next) => {
  try {
    const limit  = req.query.limit  ?? 50;
    const offset = req.query.offset ?? 0;
    const { search } = req.query;

    const applyFilters = (qb) => {
      if (search) qb = qb.ilike('email', `%${search}%`);
      return qb;
    };

    const dataQuery = applyFilters(
      supabaseAdmin
        .from('newsletter_subscribers')
        .select('id, email, source, ip, user_agent, created_at', { count: 'exact' })
    )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { rows, total } = await rangeOrEmpty(dataQuery, () =>
      applyFilters(supabaseAdmin.from('newsletter_subscribers').select('id', { count: 'exact', head: true }))
    );

    return success(res, {
      subscribers: rows,
      pagination: { total, limit, offset, returned: rows.length },
    });
  } catch (error) { next(error); }
});

router.delete('/newsletter/:id', uuidParam, validate, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('newsletter_subscribers')
      .delete()
      .eq('id', req.params.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data)  throw new NotFoundError('Subscriber not found');
    return success(res, { message: 'Subscriber removed', deleted: { id: data.id, email: data.email } });
  } catch (error) { next(error); }
});


// ─── Waitlist entries ──────────────────────────────────────────────────────
router.get('/waitlist', [
  ...paginationValidators,
  query('search').optional().trim().isLength({ max: 100 }),
], validate, async (req, res, next) => {
  try {
    const limit  = req.query.limit  ?? 50;
    const offset = req.query.offset ?? 0;
    const { search } = req.query;

    const applyFilters = (qb) => {
      if (search) qb = qb.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
      return qb;
    };

    const dataQuery = applyFilters(
      supabaseAdmin
        .from('waitlist_entries')
        .select('id, name, email, source, ip, user_agent, created_at', { count: 'exact' })
    )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { rows, total } = await rangeOrEmpty(dataQuery, () =>
      applyFilters(supabaseAdmin.from('waitlist_entries').select('id', { count: 'exact', head: true }))
    );

    return success(res, {
      entries: rows,
      pagination: { total, limit, offset, returned: rows.length },
    });
  } catch (error) { next(error); }
});

router.delete('/waitlist/:id', uuidParam, validate, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('waitlist_entries')
      .delete()
      .eq('id', req.params.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data)  throw new NotFoundError('Waitlist entry not found');
    return success(res, { message: 'Waitlist entry removed', deleted: { id: data.id, email: data.email } });
  } catch (error) { next(error); }
});


// ─── Lifestyle / Health-Library articles (admin CRUD) ──────────────────────
// These power BOTH the public landing page (uteriflow.com/articles) and the
// mobile app's health library. Public reads go through /api/v1/lifestyle and
// only return `is_published = true`; admins manage the full set here.
//
// Category must match the DB CHECK constraint on lifestyle_articles.category.
const LIFESTYLE_CATEGORIES = ['Daily Habits', 'Stress Management', 'Cycle Care'];

const articleBodyValidators = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('summary').optional({ nullable: true }).trim().isLength({ max: 500 }),
  body('content').optional({ nullable: true }).isString(),
  body('category').optional().isIn(LIFESTYLE_CATEGORIES)
    .withMessage(`Category must be one of: ${LIFESTYLE_CATEGORIES.join(', ')}`),
  body('readTime').optional({ nullable: true }).isInt({ min: 1, max: 60 }).toInt(),
  body('imageUrl').optional({ nullable: true }).isString().isLength({ max: 1000 }),
  body('isPublished').optional().isBoolean().toBoolean(),
];

// PATCH variant — every field optional (title not required for partial edits).
const articleUpdateValidators = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty').isLength({ max: 200 }),
  body('summary').optional({ nullable: true }).trim().isLength({ max: 500 }),
  body('content').optional({ nullable: true }).isString(),
  body('category').optional().isIn(LIFESTYLE_CATEGORIES)
    .withMessage(`Category must be one of: ${LIFESTYLE_CATEGORIES.join(', ')}`),
  body('readTime').optional({ nullable: true }).isInt({ min: 1, max: 60 }).toInt(),
  body('imageUrl').optional({ nullable: true }).isString().isLength({ max: 1000 }),
  body('isPublished').optional().isBoolean().toBoolean(),
];

// Map camelCase request body → snake_case columns, only for provided keys.
function articleColumnsFromBody(b) {
  const cols = {};
  if (b.title       !== undefined) cols.title        = b.title;
  if (b.summary     !== undefined) cols.summary      = b.summary;
  if (b.content     !== undefined) cols.content      = b.content;
  if (b.category    !== undefined) cols.category     = b.category;
  if (b.readTime    !== undefined) cols.read_time    = b.readTime;
  if (b.imageUrl    !== undefined) cols.image_url    = b.imageUrl;
  if (b.isPublished !== undefined) cols.is_published = b.isPublished;
  return cols;
}

// GET /admin/lifestyle — list ALL articles (published + drafts)
router.get('/lifestyle', [
  ...paginationValidators,
  query('search').optional().trim().isLength({ max: 200 }),
  query('category').optional().isIn(LIFESTYLE_CATEGORIES),
  query('status').optional().isIn(['all', 'published', 'draft']),
], validate, async (req, res, next) => {
  try {
    const limit  = req.query.limit  ?? 50;
    const offset = req.query.offset ?? 0;
    const { search, category, status } = req.query;

    const applyFilters = (qb) => {
      if (category) qb = qb.eq('category', category);
      if (status === 'published') qb = qb.eq('is_published', true);
      if (status === 'draft')     qb = qb.eq('is_published', false);
      if (search)   qb = qb.ilike('title', `%${search}%`);
      return qb;
    };

    const dataQuery = applyFilters(
      supabaseAdmin
        .from('lifestyle_articles')
        .select('id, title, summary, image_url, category, read_time, is_published, created_at, updated_at', { count: 'exact' })
    )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { rows, total } = await rangeOrEmpty(dataQuery, () =>
      applyFilters(supabaseAdmin.from('lifestyle_articles').select('id', { count: 'exact', head: true }))
    );

    return success(res, {
      articles: rows,
      pagination: { total, limit, offset, returned: rows.length },
    });
  } catch (error) { next(error); }
});

// GET /admin/lifestyle/:id — full article (incl. unpublished, for editing)
router.get('/lifestyle/:id', uuidParam, validate, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('lifestyle_articles')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data)  throw new NotFoundError('Article not found');
    return success(res, { article: data });
  } catch (error) { next(error); }
});

// POST /admin/lifestyle — create an article
router.post('/lifestyle', articleBodyValidators, validate, async (req, res, next) => {
  try {
    const cols = articleColumnsFromBody(req.body);
    // Sensible defaults so a minimal create still satisfies the schema.
    if (cols.category    === undefined) cols.category     = 'Daily Habits';
    if (cols.content     === undefined) cols.content      = '';
    if (cols.is_published === undefined) cols.is_published = true;

    const { data, error } = await supabaseAdmin
      .from('lifestyle_articles')
      .insert(cols)
      .select()
      .single();
    if (error) throw error;

    return success(res, { message: 'Article created successfully', article: data }, 201);
  } catch (error) { next(error); }
});

// PATCH /admin/lifestyle/:id — update an article (any subset of fields)
router.patch('/lifestyle/:id', [...uuidParam, ...articleUpdateValidators], validate, async (req, res, next) => {
  try {
    const cols = articleColumnsFromBody(req.body);
    if (Object.keys(cols).length === 0)
      return success(res, { message: 'No changes provided' });

    const { data, error } = await supabaseAdmin
      .from('lifestyle_articles')
      .update(cols)
      .eq('id', req.params.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data)  throw new NotFoundError('Article not found');

    return success(res, { message: 'Article updated successfully', article: data });
  } catch (error) { next(error); }
});

// DELETE /admin/lifestyle/:id
router.delete('/lifestyle/:id', uuidParam, validate, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('lifestyle_articles')
      .delete()
      .eq('id', req.params.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data)  throw new NotFoundError('Article not found');
    return success(res, { message: 'Article deleted successfully', deleted: { id: data.id, title: data.title } });
  } catch (error) { next(error); }
});


export default router;
