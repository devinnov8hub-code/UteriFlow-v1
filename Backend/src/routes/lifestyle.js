/**
 * Lifestyle / Health Library routes
 * Mounted at /api/v1/lifestyle
 *
 * NOTE: These endpoints are PUBLIC (no authenticateUser middleware).
 * The landing page (uteriflow.com/articles) fetches articles to display to
 * unauthenticated visitors as part of the marketing/wellness content. Only
 * `is_published = true` articles are returned, so this is safe.
 */
import express from 'express';
import { query, param } from 'express-validator';
import supabase, { supabaseAdmin } from '../config/supabase.js';
import { validate } from '../middleware/validate.js';
import { NotFoundError } from '../errors/index.js';
import { success } from '../utils/response.js';

const router = express.Router();

// These endpoints are PUBLIC (no JWT). The `lifestyle_articles` RLS policy only
// grants SELECT to the `authenticated` role, so an anonymous request through the
// anon client matches NO policy and silently returns ZERO rows — which is why the
// landing page showed "0 articles" and the lifestyle tip never rendered.
//
// We read through the service-role client (which bypasses RLS). The query is
// always constrained to `is_published = true` and selects only safe public
// columns, so this is safe. Falls back to the anon client in local dev where no
// service-role key is configured (and where migration v7 adds an anon policy).
const readClient = supabaseAdmin || supabase;

// GET /api/v1/lifestyle?category=Daily+Habits&search=pcos&limit=10&offset=0
router.get('/', [
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
  query('category').optional().isIn(['Daily Habits', 'Stress Management', 'Cycle Care']),
  query('search').optional().trim().isLength({ max: 200 }),
], validate, async (req, res, next) => {
  try {
    const limit    = req.query.limit  ?? 10;
    const offset   = req.query.offset ?? 0;
    const { category, search } = req.query;

    let q = readClient
      .from('lifestyle_articles')
      .select('id, title, summary, image_url, category, read_time, created_at', { count: 'exact' })
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) q = q.eq('category', category);
    if (search)   q = q.ilike('title', `%${search}%`);

    const { data: articles, count, error } = await q;
    if (error) throw error;

    return success(res, {
      articles: articles ?? [],
      pagination: { total: count, limit, offset, returned: (articles ?? []).length },
    });
  } catch (error) { next(error); }
});

// GET /api/v1/lifestyle/:id  — full article content
router.get('/:id', [
  param('id').isUUID().withMessage('Invalid article ID'),
], validate, async (req, res, next) => {
  try {
    const { data: article, error } = await readClient
      .from('lifestyle_articles')
      .select('*')
      .eq('id', req.params.id)
      .eq('is_published', true)
      .maybeSingle();
    if (error) throw error;
    if (!article) throw new NotFoundError('Article not found');

    return success(res, { article });
  } catch (error) { next(error); }
});

export default router;
