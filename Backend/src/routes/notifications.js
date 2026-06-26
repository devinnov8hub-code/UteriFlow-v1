/**
 * Notifications routes
 * Mounted at /api/v1/notifications
 */
import express from 'express';
import supabase, { supabaseAdmin } from '../config/supabase.js';
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

// ─── Device push tokens (Firebase Cloud Messaging) ────────────────────────────
// The mobile app calls POST /notifications/token after sign-in (and whenever the
// FCM token refreshes) to register the device for push, and DELETE on sign-out.
//
// Writes go through the service-role client so a token can be reassigned from a
// previous user to the current one (same device, different login) without
// tripping row-level security. We always set user_id = the authenticated user.

// POST /api/v1/notifications/token   body: { token, deviceType? }
router.post('/token', notificationValidators.registerToken, validate, async (req, res, next) => {
  try {
    const { token, deviceType } = req.body;
    const writeClient = supabaseAdmin || req.supabase;
    const now = new Date().toISOString();

    const { data, error } = await writeClient
      .from('user_fcm_tokens')
      .upsert(
        {
          user_id:      req.user.id,
          token,
          device_type:  deviceType ?? null,
          updated_at:   now,
          last_used_at: now,
        },
        { onConflict: 'token' },
      )
      .select('id, device_type, created_at')
      .maybeSingle();
    if (error) throw error;

    return success(res, { message: 'Device registered for push notifications', token: data }, 201);
  } catch (error) { next(error); }
});

// DELETE /api/v1/notifications/token   body: { token }
router.delete('/token', notificationValidators.unregisterToken, validate, async (req, res, next) => {
  try {
    const { token } = req.body;
    const writeClient = supabaseAdmin || req.supabase;

    // Only delete a token that belongs to the requesting user.
    const { error } = await writeClient
      .from('user_fcm_tokens')
      .delete()
      .eq('token', token)
      .eq('user_id', req.user.id);
    if (error) throw error;

    return success(res, { message: 'Device unregistered from push notifications' });
  } catch (error) { next(error); }
});


export default router;
