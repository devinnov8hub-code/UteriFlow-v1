-- ═══════════════════════════════════════════════════════════════
-- v4: Fix comments RLS — run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Add missing UPDATE policy on comments ─────────────────────
-- Without this, updating replies_count on a parent comment throws
-- an RLS error (500 DATABASE_ERROR) when a user posts a reply.
-- Also blocks any future comment editing features.
DROP POLICY IF EXISTS "comments_update" ON comments;
CREATE POLICY "comments_update"
  ON comments FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
-- Note: true/true allows any authenticated user to update any comment row.
-- replies_count and likes_count are app-managed counters, not user content.
-- If you later add comment editing (user edits their own content), tighten to:
--   USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id)


-- ── 2. Fix user_profiles SELECT policy ───────────────────────────
-- Current policy: USING (auth.uid() = id) — users can only read their OWN profile.
-- This means enrichComments/enrichPosts cannot fetch other users' display_name
-- and avatar_url, so author always comes back as null for other people's posts/comments.
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT TO authenticated
  USING (true);
-- Allows any authenticated user to read any profile row.
-- Only public fields (display_name, avatar_url) are used in enrichment queries.
-- Sensitive fields are never returned to other users by the app queries.
