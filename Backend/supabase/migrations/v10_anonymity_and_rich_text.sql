-- ════════════════════════════════════════════════════════════════════════════
--  v10 — Anonymous comments, schema-drift repair, and article rich text
-- ════════════════════════════════════════════════════════════════════════════
--  Run once in Supabase Dashboard → SQL Editor.
--
--  SAFE TO RE-RUN: every statement is idempotent (IF NOT EXISTS / DO UPDATE).
--  NO DATA IS DELETED OR REWRITTEN. Existing rows keep their current values;
--  new columns are added with safe defaults.
--
--  Covers three things:
--    1. posts.is_anonymous          — repairs schema drift (see note below)
--    2. comments.is_anonymous       — makes anonymous COMMENTS possible
--    3. lifestyle_articles.content_html — rich-text article bodies
-- ════════════════════════════════════════════════════════════════════════════


-- ── 1. posts.is_anonymous — SCHEMA DRIFT REPAIR ─────────────────────────────
-- The application code already reads and writes posts.is_anonymous, but no
-- migration ever created it: the column was added by hand in the dashboard.
-- That means the migration files alone could NOT rebuild this database.
-- This statement makes the schema files match reality again. If the column is
-- already present (it should be), this is a harmless no-op.
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;


-- ── 2. comments.is_anonymous — THE ACTUAL PRIVACY FIX ───────────────────────
-- Previously a user could post anonymously, but any comment they wrote still
-- returned their real display name and avatar from the API. Anonymity could
-- not be applied to comments at all because there was nowhere to record it.
--
-- author_id is still stored (so a user can manage and delete their own
-- comments, and so moderation still works) — the API simply never exposes
-- author details when is_anonymous is true.
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;

-- Existing comments stay non-anonymous, which matches how they were written
-- and displayed. No back-fill is performed on purpose: retroactively hiding
-- authorship would change the meaning of conversations already published.

COMMENT ON COLUMN comments.is_anonymous IS
  'When true the API withholds author identity (name, avatar, initial). author_id is still stored for ownership and moderation.';


-- ── 3. lifestyle_articles.content_html — RICH TEXT ──────────────────────────
-- The admin article editor now supports headings, bold, italic, underline,
-- alignment, lists and links. That formatted output is stored here as
-- sanitised HTML.
--
-- The existing `content` column is KEPT and still populated with a plain-text
-- version of the same article on every save. Older mobile builds that read
-- `content` therefore keep working exactly as before, while updated clients
-- and the landing page render `content_html`.
ALTER TABLE lifestyle_articles
  ADD COLUMN IF NOT EXISTS content_html text;

COMMENT ON COLUMN lifestyle_articles.content_html IS
  'Sanitised rich-text HTML body. Render this when present; fall back to content (plain text) when null.';


-- ── Verification ────────────────────────────────────────────────────────────
-- Run these to confirm the migration applied:
--
--   SELECT column_name, data_type, column_default
--     FROM information_schema.columns
--    WHERE (table_name = 'comments'           AND column_name = 'is_anonymous')
--       OR (table_name = 'posts'              AND column_name = 'is_anonymous')
--       OR (table_name = 'lifestyle_articles' AND column_name = 'content_html');
--
-- Expected: three rows.
