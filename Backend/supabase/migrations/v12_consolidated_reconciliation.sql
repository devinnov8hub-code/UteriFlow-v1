-- ════════════════════════════════════════════════════════════════════════════
--  UteriFlow — Consolidated Schema Reconciliation  (run this ONE file)
-- ════════════════════════════════════════════════════════════════════════════
--
--  WHAT THIS IS
--  ------------
--  A single, idempotent migration that brings any UteriFlow database up to the
--  exact schema the current backend expects. It was built by scanning every
--  column, table and policy the code actually reads or writes and reconciling
--  that against every prior migration (schema.sql, v2–v11).
--
--  WHY IT EXISTS
--  -------------
--  The project accumulated near-duplicate migration files that DIFFER:
--    • "v2_app_features 1.sql" vs "v2_app_features 2.sql" — only the second
--      widens pain_level to 0–10 and adds the `discharge` column the app writes.
--    • "v3_lifestyle_and_fixes.sql" vs "v3_run_this_in_supabase.sql" — different
--      lengths, easy to have run the wrong one.
--  If the wrong file was applied, columns the backend needs are silently
--  missing, which surfaces as intermittent 500s. This file removes that
--  uncertainty: it re-asserts everything with IF NOT EXISTS / DO-blocks so it
--  is safe whether your DB is brand new, fully migrated, or somewhere between.
--
--  SAFETY
--  ------
--    • Every statement is idempotent. Running it twice changes nothing.
--    • It only ADDS columns/constraints/policies. It never drops data.
--    • It does NOT touch period_logs rows (the duplicate-row cleanup remains a
--      separate, optional, human-reviewed step — see the note at the very end).
--
--  HOW TO RUN
--  ----------
--  Supabase Dashboard → SQL Editor → paste this whole file → Run. That's it.
--  After this, you do NOT need to run v10 (or any earlier vN) separately; this
--  file supersedes them for schema purposes.
-- ════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
--  1. user_profiles — every column the engine reads
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS avatar_url            text,
  ADD COLUMN IF NOT EXISTS bio                   text,
  ADD COLUMN IF NOT EXISTS cycle_length_avg      integer DEFAULT 28,
  ADD COLUMN IF NOT EXISTS period_length_avg     integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS last_period_start     date,
  ADD COLUMN IF NOT EXISTS contraceptive_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS personality_type      text,
  ADD COLUMN IF NOT EXISTS motivation_style      text,
  ADD COLUMN IF NOT EXISTS notification_pref     text DEFAULT 'important_only';

-- Constrained columns are added in DO-blocks so a re-run never errors on an
-- already-present constraint, and so a value the code emits can never violate
-- a CHECK. Each CHECK list below is exactly the set the backend can write.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='user_profiles' AND column_name='pcos_status') THEN
    ALTER TABLE user_profiles ADD COLUMN pcos_status text
      CHECK (pcos_status IN ('confirmed','suspected','none'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='user_profiles' AND column_name='pcos_tier') THEN
    ALTER TABLE user_profiles ADD COLUMN pcos_tier text
      CHECK (pcos_tier IN ('none','possible','likely','confirmed'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='user_profiles' AND column_name='user_type') THEN
    ALTER TABLE user_profiles ADD COLUMN user_type text
      CHECK (user_type IN ('REGULAR','IRREGULAR','PCOS'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='user_profiles' AND column_name='cycle_length_range') THEN
    ALTER TABLE user_profiles ADD COLUMN cycle_length_range text
      CHECK (cycle_length_range IN ('lt_21','21_35','36_60','gt_60'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='user_profiles' AND column_name='period_length_range') THEN
    ALTER TABLE user_profiles ADD COLUMN period_length_range text
      CHECK (period_length_range IN ('1_2','3_5','6_8','9_plus'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='user_profiles' AND column_name='contraceptive_type') THEN
    ALTER TABLE user_profiles ADD COLUMN contraceptive_type text
      CHECK (contraceptive_type IN (
        'none','combined_pill','mini_pill','hormonal_iud',
        'implant','injectable','other_hormonal','prefer_not_to_say'));
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
--  2. period_symptoms — the `discharge` column only existed in one v2 variant
-- ─────────────────────────────────────────────────────────────────────────────
-- The backend writes `discharge` on every symptom log. If the DB was built from
-- "v2_app_features 1.sql", this column is missing and symptom logging 500s.
ALTER TABLE period_symptoms
  ADD COLUMN IF NOT EXISTS discharge text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'period_symptoms_discharge_check'
  ) THEN
    ALTER TABLE period_symptoms
      ADD CONSTRAINT period_symptoms_discharge_check
      CHECK (discharge IS NULL OR discharge IN ('dry','sticky','creamy','egg_white'));
  END IF;
END $$;

-- Also reconcile pain_level to the wider 0–10 range the app sends (the "1"
-- variant capped the floor at 1, rejecting a logged 0). Safe if already 0–10.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'period_symptoms_pain_level_check') THEN
    ALTER TABLE period_symptoms DROP CONSTRAINT period_symptoms_pain_level_check;
  END IF;
  ALTER TABLE period_symptoms
    ADD CONSTRAINT period_symptoms_pain_level_check
    CHECK (pain_level IS NULL OR pain_level BETWEEN 0 AND 10);
END $$;

-- The symptom log's optional free-text link to a period.
ALTER TABLE period_symptoms
  ADD COLUMN IF NOT EXISTS log_id uuid;


-- ─────────────────────────────────────────────────────────────────────────────
--  3. Community: anonymity on posts AND comments
-- ─────────────────────────────────────────────────────────────────────────────
-- posts.is_anonymous existed in production only because it was added by hand in
-- the dashboard (schema drift) — no migration created it. This makes the schema
-- files match reality again.
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;

-- comments.is_anonymous is the actual privacy fix: without it, a comment written
-- "anonymously" still returned the author's real name and avatar from the API.
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN comments.is_anonymous IS
  'When true the API withholds author identity. author_id is still stored for ownership and moderation.';


-- ─────────────────────────────────────────────────────────────────────────────
--  4. Lifestyle articles: rich-text body
-- ─────────────────────────────────────────────────────────────────────────────
-- The admin editor stores sanitised HTML here. The existing `content` column is
-- kept and still populated with plain text, so older app builds keep working.
ALTER TABLE lifestyle_articles
  ADD COLUMN IF NOT EXISTS content_html text;

COMMENT ON COLUMN lifestyle_articles.content_html IS
  'Sanitised rich-text HTML body. Render when present; fall back to content (plain text) when null.';


-- ─────────────────────────────────────────────────────────────────────────────
--  5. Storage bucket for article cover images
-- ─────────────────────────────────────────────────────────────────────────────
-- Public bucket so covers render on the landing page and in the app. Uploads go
-- through the backend with the service-role key, which bypasses storage RLS.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'article-images', 'article-images', true, 5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read (covers are shown to logged-out visitors and in the app).
DROP POLICY IF EXISTS "Public read article images" ON storage.objects;
CREATE POLICY "Public read article images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'article-images');

-- Service-role full access (backend uploads).
DROP POLICY IF EXISTS "Service role manages article images" ON storage.objects;
CREATE POLICY "Service role manages article images"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'article-images')
  WITH CHECK (bucket_id = 'article-images');


-- ─────────────────────────────────────────────────────────────────────────────
--  6. Public read of PUBLISHED lifestyle articles (landing page, logged-out)
-- ─────────────────────────────────────────────────────────────────────────────
-- The landing page reads articles without a session. Without an anon SELECT
-- policy, RLS returns zero rows and the articles page looks empty.
-- Guarded so it's a no-op if the lifestyle_articles table doesn't exist yet.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lifestyle_articles') THEN
    EXECUTE 'ALTER TABLE lifestyle_articles ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Public read published articles" ON lifestyle_articles';
    EXECUTE 'CREATE POLICY "Public read published articles" ON lifestyle_articles FOR SELECT TO public USING (is_published = true)';
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
--  7. FCM tokens (push notifications)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_fcm_tokens (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token        text        NOT NULL UNIQUE,
  device_type  text        CHECK (device_type IN ('ios','android','web')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_fcm_tokens_user ON user_fcm_tokens(user_id);
ALTER TABLE user_fcm_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own fcm tokens" ON user_fcm_tokens;
CREATE POLICY "Users manage own fcm tokens"
  ON user_fcm_tokens FOR ALL TO authenticated USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
--  8. Helpful indexes for the period engine (safe if already present)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_period_logs_user_start
  ON period_logs(user_id, start_date);
CREATE INDEX IF NOT EXISTS idx_cycle_predictions_current
  ON cycle_predictions(user_id, is_current);


-- ─────────────────────────────────────────────────────────────────────────────
--  Verification (read-only) — run after applying
-- ─────────────────────────────────────────────────────────────────────────────
-- Expect the "missing" count to be 0.
--
-- SELECT
--   COUNT(*) FILTER (WHERE t.table_name='user_profiles'      AND c.column_name IS NULL) AS up_missing,
--   COUNT(*) FILTER (WHERE t.table_name='period_symptoms'    AND c.column_name IS NULL) AS sym_missing
-- FROM (VALUES
--   ('user_profiles','pcos_status'),('user_profiles','contraceptive_type'),
--   ('user_profiles','cycle_length_range'),('user_profiles','period_length_range'),
--   ('user_profiles','last_period_start'),('period_symptoms','discharge')
-- ) AS t(table_name,col)
-- LEFT JOIN information_schema.columns c
--   ON c.table_name=t.table_name AND c.column_name=t.col;
--
-- Quick column checks:
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name='user_profiles' ORDER BY column_name;
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name='period_symptoms' ORDER BY column_name;


-- ════════════════════════════════════════════════════════════════════════════
--  NOT INCLUDED HERE (on purpose): duplicate period_logs cleanup.
--  Removing duplicate rows changes user data and needs a human to review which
--  overlapping edits to keep. It lives in its own file
--  (v11_duplicate_period_logs_SAFE.sql) and is OPTIONAL — the backend now
--  de-duplicates in memory when computing predictions, so cycle calculations
--  are already correct even before that cleanup runs.
-- ════════════════════════════════════════════════════════════════════════════
