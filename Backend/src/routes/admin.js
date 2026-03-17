import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAdmin } from '../middleware/admin.js';
import { validate } from '../middleware/validate.js';
import { body, param, query } from 'express-validator';
import { AppError, NotFoundError } from '../errors/index.js';

const router = express.Router();

router.use(requireAdmin);

const paginationValidators = [
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
];

const uuidParam = [param('id').isUUID().withMessage('Invalid ID')];

router.get('/stats', async (req, res, next) => {
  try {
  
    const { count: totalUsers, error: usersError } = await supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });
    if (usersError) throw usersError;

    const { count: onboardedUsers, error: onboardedError } = await supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('onboarding_completed', true);
    if (onboardedError) throw onboardedError;

    const { count: totalPeriodLogs, error: periodError } = await supabaseAdmin
      .from('period_logs')
      .select('*', { count: 'exact', head: true });
    if (periodError) throw periodError;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: newUsersWeek, error: newUsersError } = await supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo);
    if (newUsersError) throw newUsersError;

    const { data: hormonalBreakdown, error: hormonalError } = await supabaseAdmin
      .from('user_profiles')
      .select('hormonal_status');
    if (hormonalError) throw hormonalError;

    const hormonalCounts = hormonalBreakdown.reduce((acc, { hormonal_status }) => {
      const key = hormonal_status || 'not_set';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const { data: ageBreakdown, error: ageError } = await supabaseAdmin
      .from('user_profiles')
      .select('age_group');
    if (ageError) throw ageError;

    const ageCounts = ageBreakdown.reduce((acc, { age_group }) => {
      const key = age_group || 'not_set';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return res.json({
      overview: {
        totalUsers,
        onboardedUsers,
        onboardingRate:
          totalUsers > 0 ? ((onboardedUsers / totalUsers) * 100).toFixed(1) + '%' : '0%',
        newUsersLast7Days: newUsersWeek,
        totalPeriodLogs,
      },
      breakdowns: {
        hormonalStatus: hormonalCounts,
        ageGroup: ageCounts,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get(
  '/users',
  [
    ...paginationValidators,
    query('search').optional().trim().isLength({ max: 100 }),
    query('onboarding_completed').optional().isBoolean().toBoolean(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const limit = req.query.limit ?? 20;
      const offset = req.query.offset ?? 0;
      const { search, onboarding_completed } = req.query;

      let query = supabaseAdmin
        .from('user_profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (search) {
        query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
      }

      if (onboarding_completed !== undefined) {
        query = query.eq('onboarding_completed', onboarding_completed);
      }

      const { data, count, error } = await query;
      if (error) throw error;

      return res.json({
        users: data,
        pagination: { total: count, limit, offset, returned: data.length },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/users/:id', uuidParam, validate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) throw new NotFoundError('User not found');

    const { count: periodCount, error: countError } = await supabaseAdmin
      .from('period_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id);

    if (countError) throw countError;

    return res.json({ user: { ...profile, periodLogCount: periodCount } });
  } catch (error) {
    next(error);
  }
});

router.patch(
  '/users/:id',
  [
    ...uuidParam,
    body('display_name').optional().trim().isLength({ min: 1, max: 50 }),
    body('age_group')
      .optional()
      .isIn(['18-24', '25-29', '30-34', '35-39', '40-44', '45+']),
    body('hormonal_status')
      .optional()
      .isIn(['diagnosed', 'suspected', 'not_sure', 'no']),
    body('period_regularity')
      .optional()
      .isIn(['regular', 'varies_week', 'unpredictable', 'not_tracked']),
    body('onboarding_completed').optional().isBoolean(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const allowedFields = [
        'display_name',
        'age_group',
        'hormonal_status',
        'period_regularity',
        'health_focus',
        'onboarding_completed',
      ];

      const updates = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }

      if (Object.keys(updates).length === 0) {
        throw new AppError('No valid fields provided for update', 400, 'NO_FIELDS');
      }

      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new NotFoundError('User not found');

      return res.json({ message: 'User profile updated successfully', user: data });
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/users/:id', uuidParam, validate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: profile, error: checkError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email')
      .eq('id', id)
      .maybeSingle();

    if (checkError) throw checkError;
    if (!profile) throw new NotFoundError('User not found');

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (deleteError) throw deleteError;

    return res.json({
      message: 'User deleted successfully',
      deleted: { id: profile.id, email: profile.email },
    });
  } catch (error) {
    next(error);
  }
});

router.get(
  '/period-logs',
  [
    ...paginationValidators,
    query('user_id').optional().isUUID().withMessage('Invalid user_id'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const limit = req.query.limit ?? 20;
      const offset = req.query.offset ?? 0;
      const { user_id } = req.query;

      let q = supabaseAdmin
        .from('period_logs')
        .select('*', { count: 'exact' })
        .order('start_date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (user_id) {
        q = q.eq('user_id', user_id);
      }

      const { data, count, error } = await q;
      if (error) throw error;

      return res.json({
        periodLogs: data,
        pagination: { total: count, limit, offset, returned: data.length },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/period-logs/:id', uuidParam, validate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('period_logs')
      .delete()
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundError('Period log not found');

    return res.json({ message: 'Period log deleted successfully', deleted: { id: data.id } });
  } catch (error) {
    next(error);
  }
});

router.post('/users/:id/grant-admin', uuidParam, validate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      user_metadata: { is_admin: true },
    });

    if (error) throw error;
    if (!data?.user) throw new NotFoundError('User not found');

    return res.json({ message: 'Admin privileges granted', userId: id });
  } catch (error) {
    next(error);
  }
});


router.post('/users/:id/revoke-admin', uuidParam, validate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      user_metadata: { is_admin: false },
    });

    if (error) throw error;
    if (!data?.user) throw new NotFoundError('User not found');

    return res.json({ message: 'Admin privileges revoked', userId: id });
  } catch (error) {
    next(error);
  }
});

export default router;
