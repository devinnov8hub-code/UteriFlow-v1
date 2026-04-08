/**
 * User-facing community routes
 * Mounted at /api/v1/community
 */
import express from 'express';
import supabase from '../config/supabase.js';
import { authenticateUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { communityValidators } from '../validators/index.js';
import { NotFoundError } from '../errors/index.js';
import { success } from '../utils/response.js';

const router = express.Router();
router.use(authenticateUser);

const { pagination, uuidParam, createComment, reportPost } = communityValidators;

// ─── Helper: manually enrich posts with author from user_profiles ─
// posts.author_id → auth.users(id), user_profiles.id → auth.users(id)
// No direct FK between posts and user_profiles exists
async function enrichPosts(posts, userId) {
  if (!posts || posts.length === 0) return posts;
  const authorIds = [...new Set(posts.map(p => p.author_id).filter(Boolean))];

  const [profiles, likes, bookmarks] = await Promise.all([
    authorIds.length > 0
      ? supabase.from('user_profiles').select('id, display_name, avatar_url').in('id', authorIds)
      : { data: [] },
    userId
      ? supabase.from('post_likes').select('post_id').eq('user_id', userId).in('post_id', posts.map(p => p.id))
      : { data: [] },
    userId
      ? supabase.from('post_bookmarks').select('post_id').eq('user_id', userId).in('post_id', posts.map(p => p.id))
      : { data: [] },
  ]);

  const profileMap  = {};
  const likedSet    = new Set();
  const bookmarkSet = new Set();

  for (const p of (profiles.data ?? []))   profileMap[p.id]   = p;
  for (const l of (likes.data     ?? []))   likedSet.add(l.post_id);
  for (const b of (bookmarks.data  ?? []))  bookmarkSet.add(b.post_id);

  return posts.map(p => ({
    ...p,
    author:        p.author_id ? (profileMap[p.author_id] ?? null) : null,
    is_liked:      likedSet.has(p.id),
    is_bookmarked: bookmarkSet.has(p.id),
  }));
}

async function enrichComments(comments) {
  if (!comments || comments.length === 0) return comments;
  const authorIds = [...new Set(comments.map(c => c.author_id).filter(Boolean))];
  if (authorIds.length === 0) return comments;

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, display_name, avatar_url')
    .in('id', authorIds);

  const profileMap = {};
  for (const p of (profiles ?? [])) profileMap[p.id] = p;

  return comments.map(c => ({
    ...c,
    author: c.author_id ? (profileMap[c.author_id] ?? null) : null,
  }));
}

// ─── List posts ───────────────────────────────────────────────
router.get('/posts', pagination, validate, async (req, res, next) => {
  try {
    const limit    = req.query.limit    ?? 20;
    const offset   = req.query.offset   ?? 0;
    const { category } = req.query;
    const userId   = req.user.id;

    let q = supabase
      .from('posts')
      .select('*', { count: 'exact' })
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) q = q.eq('category', category);

    const { data: rawPosts, count, error } = await q;
    if (error) throw error;

    const posts = await enrichPosts(rawPosts ?? [], userId);
    return success(res, { posts, pagination: { total: count, limit, offset, returned: posts.length } });
  } catch (error) { next(error); }
});

// ─── Get single post ──────────────────────────────────────────
router.get('/posts/:id', uuidParam, validate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data: post, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', req.params.id)
      .eq('is_published', true)
      .maybeSingle();
    if (error) throw error;
    if (!post) throw new NotFoundError('Post not found');

    const { count: commentCount } = await supabase
      .from('comments').select('*', { count: 'exact', head: true }).eq('post_id', req.params.id);

    const [enriched] = await enrichPosts([post], userId);
    return success(res, { post: { ...enriched, commentCount } });
  } catch (error) { next(error); }
});

// ─── Like / Unlike post ────────────────────────────────────────
router.post('/posts/:id/like', uuidParam, validate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data: existing } = await supabase
      .from('post_likes').select('id').eq('post_id', id).eq('user_id', userId).maybeSingle();

    if (existing) {
      await supabase.from('post_likes').delete().eq('id', existing.id);
      const { data: post } = await supabase.from('posts').select('likes_count').eq('id', id).maybeSingle();
      if (post) await supabase.from('posts').update({ likes_count: Math.max(0, (post.likes_count ?? 1) - 1) }).eq('id', id);
      return success(res, { liked: false, message: 'Post unliked' });
    } else {
      await supabase.from('post_likes').insert({ post_id: id, user_id: userId });
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
      .from('post_bookmarks').select('id').eq('post_id', id).eq('user_id', userId).maybeSingle();

    if (existing) {
      await supabase.from('post_bookmarks').delete().eq('id', existing.id);
      return success(res, { bookmarked: false, message: 'Bookmark removed' });
    } else {
      await supabase.from('post_bookmarks').insert({ post_id: id, user_id: userId });
      return success(res, { bookmarked: true, message: 'Post bookmarked' });
    }
  } catch (error) { next(error); }
});

// ─── List bookmarks ───────────────────────────────────────────
router.get('/bookmarks', pagination, validate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit  = req.query.limit  ?? 20;
    const offset = req.query.offset ?? 0;

    const { data: bookmarks, count, error } = await supabase
      .from('post_bookmarks')
      .select('post_id', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    const postIds = (bookmarks ?? []).map(b => b.post_id);
    if (postIds.length === 0) return success(res, { posts: [], pagination: { total: 0, limit, offset } });

    const { data: rawPosts } = await supabase.from('posts').select('*').in('id', postIds).eq('is_published', true);
    const posts = await enrichPosts(rawPosts ?? [], userId);

    return success(res, { posts, pagination: { total: count, limit, offset } });
  } catch (error) { next(error); }
});

// ─── Get comments for a post ──────────────────────────────────
router.get('/posts/:id/comments', [...uuidParam, ...pagination], validate, async (req, res, next) => {
  try {
    const limit  = req.query.limit  ?? 30;
    const offset = req.query.offset ?? 0;

    const { data: rawComments, count, error } = await supabase
      .from('comments')
      .select('*', { count: 'exact' })
      .eq('post_id', req.params.id)
      .is('parent_id', null)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    const comments = await enrichComments(rawComments ?? []);
    return success(res, { comments, pagination: { total: count, limit, offset } });
  } catch (error) { next(error); }
});

// ─── Get replies for a comment ────────────────────────────────
router.get('/comments/:id/replies', uuidParam, validate, async (req, res, next) => {
  try {
    const { data: rawReplies, error } = await supabase
      .from('comments').select('*').eq('parent_id', req.params.id).order('created_at', { ascending: true });
    if (error) throw error;
    const replies = await enrichComments(rawReplies ?? []);
    return success(res, { replies });
  } catch (error) { next(error); }
});

// ─── Post a comment / reply ───────────────────────────────────
router.post('/posts/:id/comments', [...uuidParam, ...createComment], validate, async (req, res, next) => {
  try {
    const { content, parentId } = req.body;
    const userId = req.user.id;

    const { data: post } = await supabase.from('posts').select('id').eq('id', req.params.id).eq('is_published', true).maybeSingle();
    if (!post) throw new NotFoundError('Post not found');

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({ post_id: req.params.id, author_id: userId, content, parent_id: parentId ?? null })
      .select()
      .single();
    if (error) throw error;

    if (parentId) {
      const { data: parent } = await supabase.from('comments').select('replies_count').eq('id', parentId).maybeSingle();
      if (parent) await supabase.from('comments').update({ replies_count: (parent.replies_count ?? 0) + 1 }).eq('id', parentId);
    }

    const [enriched] = await enrichComments([comment]);
    return success(res, { message: 'Comment posted successfully', comment: enriched }, 201);
  } catch (error) { next(error); }
});

// ─── Like a comment ───────────────────────────────────────────
router.post('/comments/:id/like', uuidParam, validate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data: existing } = await supabase.from('comment_likes').select('id').eq('comment_id', id).eq('user_id', userId).maybeSingle();

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

// ─── Report a post ────────────────────────────────────────────
router.post('/posts/:id/report', [...uuidParam, ...reportPost], validate, async (req, res, next) => {
  try {
    await supabase.from('posts').update({ is_flagged: true }).eq('id', req.params.id);
    return success(res, { message: 'Post reported. Our team will review it shortly.' });
  } catch (error) { next(error); }
});

export default router;
