/**
 * Notifications routes
 * Mounted at /api/v1/notifications
 */
import express from 'express';
import supabase from '../config/supabase.js';
import { authenticateUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { notificationValidators } from '../validators/index.js';
import { NotFoundError } from '../errors/index.js';
import { success } from '../utils/response.js';
import { rangeOrEmpty } from '../utils/pagination.js';
import { param } from 'express-validator';

const router = express.Router();
router.use(authenticateUser);


router.get('/', notificationValidators.pagination, validate, async (req, res, next) => {
  try {
    const userId     = req.user.id;
    const limit      = req.query.limit      ?? 30;
    const offset     = req.query.offset     ?? 0;
    const unreadOnly = req.query.unread_only ?? false;

    const applyFilters = (qb) => {
      qb = qb.eq('user_id', userId);
      if (unreadOnly) qb = qb.eq('is_read', false);
      return qb;
    };

    const dataQuery = applyFilters(
      req.supabase.from('notifications').select('*', { count: 'exact' })
    )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { rows: data, total: count } = await rangeOrEmpty(dataQuery, () =>
      applyFilters(req.supabase.from('notifications').select('id', { count: 'exact', head: true }))
    );

    const { count: unreadCount } = await req.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return success(res, {
      notifications: data,
      unreadCount:   unreadCount ?? 0,
      pagination:    { total: count, limit, offset },
    });
  } catch (error) { next(error); }
});


router.patch('/:id/read', [param('id').isUUID()], validate, async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('Notification not found');
    return success(res, { message: 'Notification marked as read', notification: data });
  } catch (error) { next(error); }
});


router.patch('/read-all', async (req, res, next) => {
  try {
    const { error } = await req.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);
    if (error) throw error;
    return success(res, { message: 'All notifications marked as read' });
  } catch (error) { next(error); }
});


router.delete('/:id', [param('id').isUUID()], validate, async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from('notifications')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('Notification not found');
    return success(res, { message: 'Notification deleted' });
  } catch (error) { next(error); }
});

export default router;
