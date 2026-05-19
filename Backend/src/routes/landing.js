/**
 * Public landing-page routes
 * Mounted at /api/v1/landing
 *
 * These endpoints are PUBLIC (no auth) and accept submissions from the
 * marketing site at uteriflow.com:
 *   POST /api/v1/landing/newsletter  — subscribe to the newsletter
 *   POST /api/v1/landing/waitlist    — join the launch waitlist
 *
 * Reading these lists is admin-only and lives in routes/admin.js.
 */
import express from 'express';
import { body } from 'express-validator';
import { supabaseAdmin } from '../config/supabase.js';
import supabase from '../config/supabase.js';
import { validate } from '../middleware/validate.js';
import { ConflictError, AppError } from '../errors/index.js';
import { success } from '../utils/response.js';

const router = express.Router();

// Newsletter and waitlist must be written via the service role because the
// tables have RLS enabled with `USING (false)` — only the admin client can
// touch them. Fall back to the regular client only if service role is missing
// (development).
const writeClient = supabaseAdmin || supabase;

const captureMeta = (req) => ({
  ip:         (req.headers['x-forwarded-for']?.split(',')[0]?.trim()) || req.ip || null,
  user_agent: req.get('user-agent') || null,
});

// ─── POST /landing/newsletter ──────────────────────────────────────────────
router.post('/newsletter', [
  body('email').isEmail().normalizeEmail({ gmail_remove_dots: false })
    .withMessage('A valid email address is required'),
  body('source').optional().trim().isLength({ max: 50 }),
], validate, async (req, res, next) => {
  try {
    const { email, source } = req.body;
    const meta = captureMeta(req);

    const { data, error } = await writeClient
      .from('newsletter_subscribers')
      .insert({ email, source: source || 'landing', ...meta })
      .select('id, email, created_at')
      .single();

    if (error) {
      // Postgres unique-violation code is 23505
      if (error.code === '23505') throw new ConflictError('already_subscribed');
      throw error;
    }

    return success(res, {
      message: "You're subscribed. We'll be in touch.",
      subscriber: data,
    }, 201);
  } catch (error) { next(error); }
});


// ─── POST /landing/waitlist ────────────────────────────────────────────────
router.post('/waitlist', [
  body('name').trim().notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name is too long'),
  body('email').isEmail().normalizeEmail({ gmail_remove_dots: false })
    .withMessage('A valid email address is required'),
  body('source').optional().trim().isLength({ max: 50 }),
], validate, async (req, res, next) => {
  try {
    const { name, email, source } = req.body;
    const meta = captureMeta(req);

    const { data, error } = await writeClient
      .from('waitlist_entries')
      .insert({ name, email, source: source || 'landing', ...meta })
      .select('id, name, email, created_at')
      .single();

    if (error) {
      if (error.code === '23505') throw new ConflictError('already_registered');
      throw error;
    }

    return success(res, {
      message: "You're on the waitlist. We'll reach out soon.",
      entry: data,
    }, 201);
  } catch (error) { next(error); }
});

export default router;
