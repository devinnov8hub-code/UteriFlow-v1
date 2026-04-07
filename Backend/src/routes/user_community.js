/**
 * User-facing community routes
 * Mounted at /api/v1/community
 * Requires authenticated user (not admin)
 */
import express from 'express';
import supabase from '../config/supabase.js';
import { authenticateUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { communityValidators } from '../validators/index.js';
import { NotFoundError, ConflictError, AppError } from '../errors/index.js';
import { success } from '../utils/response.js';

const router = express.Router();
router.use(authenticateUser);

const { pagination, uuidParam, createComment, reportPost } = communityValidators;

// ─── List posts ───────────────────────────────────────────────
router.get('/posts', pagination, validate, async (req, res, next) => {
  try {
    const limit    = req.query.limit    ?? 20;
    const offset   = req.query.offset   ?? 0;
    const { category } = req.query;
    const userId   = req.user.id;

    let q = supabase
      .from('posts')
      .select('*, author:user_profiles!posts_author_id_fkey(id, display_name, avatar_url)', { count: 'exact' })
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) q = q.eq('category', category);

    const { data: posts, count, error } = await q;
    if (error) throw error;

    // Attach liked/bookmarked flags for this user
    const postIds = posts.map(p => p.id);
    const [{ data: likes }, { data: bookmarks }] = await Promise.all([
      supabase.from('post_likes').select('post_id').eq('user_id', userId).in('post_id', postIds),
      supabase.from('post_bookmarks').select('post_id').eq('user_id', userId).in('post_id', postIds),
    ]);

    const likedSet     = new Set((likes ?? []).map(l => l.post_id));
    const bookmarkSet  = new Set((bookmarks ?? []).map(b => b.post_id));

    const enriched = posts.map(p => ({
      ...p,
      is_liked:      likedSet.has(p.id),
      is_bookmarked: bookmarkSet.has(p.id),
    }));

    return success(res, { posts: enriched, pagination: { total: count, limit, offset, returned: enriched.length } });
  } catch (error) { next(error); }
});

// ─── Get single post ──────────────────────────────────────────
router.get('/posts/:id', uuidParam, validate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data: post, error } = await supabase
      .from('posts')
      .select('*, author:user_profiles!posts_author_id_fkey(id, display_name, avatar_url)')
      .eq('id', req.params.id)
      .eq('is_published', true)
      .maybeSingle();
    if (error) throw error;
    if (!post) throw new NotFoundError('Post not found');

    const [{ count: commentCount }, { data: liked }, { data: bookmarked }] = await Promise.all([
      supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', req.params.id),
      supabase.from('post_likes').select('id').eq('post_id', req.params.id).eq('user_id', userId).maybeSingle(),
      supabase.from('post_bookmarks').select('id').eq('post_id', req.params.id).eq('user_id', userId).maybeSingle(),
    ]);

    return success(res, {
      post: {
        ...post,
        commentCount,
        is_liked:      !!liked,
        is_bookmarked: !!bookmarked,
      },
    });
  } catch (error) { next(error); }
});

// ─── Like / Unlike post ────────────────────────────────────────
router.post('/posts/:id/like', uuidParam, validate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check existing like
    const { data: existing } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      // Unlike
      await supabase.from('post_likes').delete().eq('id', existing.id);
      // Decrement counter
      await supabase.rpc('decrement_likes', { post_id: id }).catch(() => {
        supabase.from('posts').select('likes_count').eq('id', id).maybeSingle().then(({ data }) => {
          if (data) supabase.from('posts').update({ likes_count: Math.max(0, (data.likes_count ?? 1) - 1) }).eq('id', id);
        });
      });
      return success(res, { liked: false, message: 'Post unliked' });
    } else {
      // Like
      await supabase.from('post_likes').insert({ post_id: id, user_id: userId });
      // Increment counter
      const { data: post } = await supabase.from('posts').select('likes_count').eq('id', id).maybeSingle();
      if (post) await supabase.from('posts').update({ likes_count: (post.likes_count ?? 0) + 1 }).eq('id', id);
      return success(res, { liked: true, message: 'Post liked' });
    }
  } catch (error) { next(error); }
});

// ─── Bookmark / Unbookmark post ────────────────────────────────
router.post('/posts/:id/bookmark', uuidParam, validate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data: existing } = await supabase
      .from('post_bookmarks')
      .select('id')
      .eq('post_id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase.from('post_bookmarks').delete().eq('id', existing.id);
      return success(res, { bookmarked: false, message: 'Bookmark removed' });
    } else {
      await supabase.from('post_bookmarks').insert({ post_id: id, user_id: userId });
      return success(res, { bookmarked: true, message: 'Post bookmarked' });
    }
  } catch (error) { next(error); }
});

// ─── List bookmarked posts ─────────────────────────────────────
router.get('/bookmarks', pagination, validate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit  = req.query.limit  ?? 20;
    const offset = req.query.offset ?? 0;

    const { data, count, error } = await supabase
      .from('post_bookmarks')
      .select('post:posts!post_bookmarks_post_id_fkey(*, author:user_profiles!posts_author_id_fkey(id, display_name, avatar_url))', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    const posts = (data ?? []).map(b => ({ ...b.post, is_bookmarked: true, is_liked: false }));
    return success(res, { posts, pagination: { total: count, limit, offset } });
  } catch (error) { next(error); }
});

// ─── Get comments for a post ──────────────────────────────────
router.get('/posts/:id/comments', [...uuidParam, ...pagination], validate, async (req, res, next) => {
  try {
    const limit  = req.query.limit  ?? 30;
    const offset = req.query.offset ?? 0;
    const userId = req.user.id;

    const { data, count, error } = await supabase
      .from('comments')
      .select('*, author:user_profiles!comments_author_id_fkey(id, display_name, avatar_url)', { count: 'exact' })
      .eq('post_id', req.params.id)
      .is('parent_id', null) // top-level only
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    return success(res, { comments: data, pagination: { total: count, limit, offset } });
  } catch (error) { next(error); }
});

// ─── Get replies for a comment ────────────────────────────────
router.get('/comments/:id/replies', uuidParam, validate, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*, author:user_profiles!comments_author_id_fkey(id, display_name, avatar_url)')
      .eq('parent_id', req.params.id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return success(res, { replies: data });
  } catch (error) { next(error); }
});

// ─── Post a comment / reply ───────────────────────────────────
router.post('/posts/:id/comments', [...uuidParam, ...createComment], validate, async (req, res, next) => {
  try {
    const { content, parentId } = req.body;
    const userId = req.user.id;

    const { data: post } = await supabase
      .from('posts')
      .select('id')
      .eq('id', req.params.id)
      .eq('is_published', true)
      .maybeSingle();
    if (!post) throw new NotFoundError('Post not found');

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id:   req.params.id,
        author_id: userId,
        content,
        parent_id: parentId ?? null,
      })
      .select('*, author:user_profiles!comments_author_id_fkey(id, display_name, avatar_url)')
      .single();
    if (error) throw error;

    // Increment replies_count on parent if it's a reply
    if (parentId) {
      const { data: parent } = await supabase.from('comments').select('replies_count').eq('id', parentId).maybeSingle();
      if (parent) await supabase.from('comments').update({ replies_count: (parent.replies_count ?? 0) + 1 }).eq('id', parentId);
    }

    return success(res, { message: 'Comment posted successfully', comment: data }, 201);
  } catch (error) { next(error); }
});

// ─── Like a comment ───────────────────────────────────────────
router.post('/comments/:id/like', uuidParam, validate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data: existing } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase.from('comment_likes').delete().eq('id', existing.id);
      const { data: c } = await supabase.from('comments').select('likes_count').eq('id', id).maybeSingle();
      if (c) await supabase.from('comments').update({ likes_count: Math.max(0, (c.likes_count ?? 1) - 1) }).eq('id', id);
      return success(res, { liked: false });
    } else {
      await supabase.from('comment_likes').insert({ comment_id: id, user_id: userId });
      const { data: c } = await supabase.from('comments').select('likes_count').eq('id', id).maybeSingle();
      if (c) await supabase.from('comments').update({ likes_count: (c.likes_count ?? 0) + 1 }).eq('id', id);
      return success(res, { liked: true });
    }
  } catch (error) { next(error); }
});

// ─── Report a post (flags it for admin review) ────────────────
router.post('/posts/:id/report', [...uuidParam, ...reportPost], validate, async (req, res, next) => {
  try {
    const { reason } = req.body;
    await supabase.from('posts').update({ is_flagged: true }).eq('id', req.params.id);
    // In production: store reason in a reports table. For now, flag the post.
    return success(res, { message: 'Post reported. Our team will review it shortly.' });
  } catch (error) { next(error); }
});

export default router;
