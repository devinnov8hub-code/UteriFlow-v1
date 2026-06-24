-- ════════════════════════════════════════════════════════════════════════════
-- v7: Public read access for published lifestyle articles
--
-- BUG: The landing page (uteriflow.com/articles) and the "lifestyle tip" widget
--      fetch articles WITHOUT a logged-in user. The only SELECT policy on
--      `lifestyle_articles` granted access to the `authenticated` role:
--
--        CREATE POLICY "lifestyle_select"
--          ON lifestyle_articles FOR SELECT TO authenticated
--          USING (is_published = true);
--
--      An anonymous request (anon role) therefore matched NO policy and RLS
--      returned ZERO rows → the site showed "0 articles" and the tip was blank,
--      even though 5 articles are seeded and published.
--
-- FIX: Grant SELECT on PUBLISHED articles to the `anon` role as well. This is the
--      correct way to expose public marketing content. The application layer also
--      now reads these endpoints through the service-role client as a belt-and-
--      braces fallback (see src/routes/lifestyle.js), but this policy is the
--      proper, least-privilege fix and is required if you ever read the table
--      directly from the browser with the anon key.
--
-- Run this in the Supabase SQL editor for the production project.
-- Safe to run multiple times.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE lifestyle_articles ENABLE ROW LEVEL SECURITY;

-- Allow anonymous (logged-out) visitors to read ONLY published articles.
DROP POLICY IF EXISTS "lifestyle_public_select" ON lifestyle_articles;
CREATE POLICY "lifestyle_public_select"
  ON lifestyle_articles
  FOR SELECT
  TO anon
  USING (is_published = true);

-- Keep the existing authenticated policy intact (recreate defensively so this
-- migration is self-contained and idempotent).
DROP POLICY IF EXISTS "lifestyle_select" ON lifestyle_articles;
CREATE POLICY "lifestyle_select"
  ON lifestyle_articles
  FOR SELECT
  TO authenticated
  USING (is_published = true);

-- Sanity check — list the SELECT policies now on the table.
SELECT policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'lifestyle_articles'
ORDER BY policyname;
