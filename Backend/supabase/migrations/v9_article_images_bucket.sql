-- ════════════════════════════════════════════════════════════════════════════
--  v9 — Storage bucket for Admin Portal article cover images
-- ════════════════════════════════════════════════════════════════════════════
--  Run this once in the Supabase Dashboard → SQL Editor.
--
--  WHY:
--    The admin portal previously only accepted a pasted "image URL". That broke
--    constantly, because cloud share links (Google Drive, Dropbox, OneDrive) are
--    HTML preview pages rather than direct image files, and hotlinked URLs
--    expire or block embedding. Admins can now upload a cover image directly
--    from their device, or import one from a cloud link — either way the image
--    is stored in OUR storage and gets a permanent public URL.
--
--  WHAT THIS DOES:
--    • Creates a PUBLIC bucket called "article-images" (5 MB / image cap)
--    • Uploads go through the backend using the SERVICE ROLE key, which
--      bypasses storage RLS — so no write policy is strictly required. The
--      policies below are added anyway as a safety net and to make the bucket
--      readable by the public landing page and the mobile app.
--
--  SAFE TO RE-RUN: every statement is idempotent.
--  DOES NOT TOUCH: existing tables, the "post-images" bucket, or any other data.
-- ════════════════════════════════════════════════════════════════════════════


-- ── 1. Create the bucket ────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'article-images',
  'article-images',
  true,                                  -- public: covers are shown on the site & app
  5242880,                               -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;


-- ── 2. Public read access ───────────────────────────────────────────────────
-- Needed so article covers render for logged-out landing-page visitors
-- and inside the mobile app.
DROP POLICY IF EXISTS "Public read article images" ON storage.objects;
CREATE POLICY "Public read article images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'article-images');


-- ── 3. Service-role full access (backend uploads) ───────────────────────────
-- The backend (/api/v1/upload/article-image) writes with the service-role key.
DROP POLICY IF EXISTS "Service role manages article images" ON storage.objects;
CREATE POLICY "Service role manages article images"
  ON storage.objects FOR ALL TO service_role
  USING       (bucket_id = 'article-images')
  WITH CHECK  (bucket_id = 'article-images');


-- ── 4. Authenticated admins may also write directly (optional safety net) ────
DROP POLICY IF EXISTS "Authenticated upload article images" ON storage.objects;
CREATE POLICY "Authenticated upload article images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'article-images');

DROP POLICY IF EXISTS "Authenticated delete article images" ON storage.objects;
CREATE POLICY "Authenticated delete article images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'article-images');


-- ── Done ────────────────────────────────────────────────────────────────────
-- Verify with:
--   SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'article-images';
