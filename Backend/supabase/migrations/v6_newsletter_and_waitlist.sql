-- ════════════════════════════════════════════════════════════════════════════
-- v6: Newsletter subscribers + Waitlist entries
--
-- Used by the public landing page:
--   POST /api/v1/landing/newsletter   → adds an email to newsletter_subscribers
--   POST /api/v1/landing/waitlist     → adds a name+email to waitlist_entries
--
-- And by the admin dashboard:
--   GET  /api/v1/admin/newsletter      → list newsletter subscribers
--   GET  /api/v1/admin/waitlist        → list waitlist entries
--   DELETE /api/v1/admin/newsletter/:id
--   DELETE /api/v1/admin/waitlist/:id
--
-- Run this file inside the Supabase SQL editor for the production project.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Newsletter subscribers ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text        NOT NULL UNIQUE,
  source      text        DEFAULT 'landing',   -- where the user signed up from
  ip          text,                            -- captured for audit / abuse review
  user_agent  text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_email      ON newsletter_subscribers (email);
CREATE INDEX IF NOT EXISTS idx_newsletter_created_at ON newsletter_subscribers (created_at DESC);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Only the service role (admin backend) accesses this table.
-- All app traffic goes through the Express API, never directly from the browser.
DROP POLICY IF EXISTS "newsletter_no_anon" ON newsletter_subscribers;
CREATE POLICY "newsletter_no_anon"
  ON newsletter_subscribers
  FOR ALL
  TO authenticated
  USING (false);


-- ─── Waitlist entries ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waitlist_entries (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  email       text        NOT NULL UNIQUE,
  source      text        DEFAULT 'landing',
  ip          text,
  user_agent  text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_email      ON waitlist_entries (email);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist_entries (created_at DESC);

ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "waitlist_no_anon" ON waitlist_entries;
CREATE POLICY "waitlist_no_anon"
  ON waitlist_entries
  FOR ALL
  TO authenticated
  USING (false);
