-- ════════════════════════════════════════════════════════════════════════════
-- v8: Device push tokens (Firebase Cloud Messaging)
--
-- Stores the FCM registration token(s) for each user so the backend can send
-- push notifications via Firebase. A user can have several devices, so this is a
-- one-to-many table. The token itself is globally unique (it identifies a single
-- app install); if the same device later signs in as a different user, the
-- INSERT ... ON CONFLICT (token) in POST /notifications/token simply reassigns
-- the row to the new user.
--
-- Run this in the Supabase SQL editor. Safe to run multiple times.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_fcm_tokens (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token        text        NOT NULL UNIQUE,
  device_type  text        CHECK (device_type IN ('ios', 'android', 'web')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_fcm_tokens_user ON user_fcm_tokens(user_id);

ALTER TABLE user_fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Users may read/insert/update/delete only their own device tokens.
-- (The backend writes through the service-role key, which bypasses RLS, so it can
--  reassign a token across users and prune dead tokens when a send fails.)
DROP POLICY IF EXISTS "fcm_manage_own" ON user_fcm_tokens;
CREATE POLICY "fcm_manage_own"
  ON user_fcm_tokens FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Keep updated_at fresh on UPDATE (reuses the shared trigger fn if present).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_user_fcm_tokens_updated_at ON user_fcm_tokens;
    CREATE TRIGGER update_user_fcm_tokens_updated_at
      BEFORE UPDATE ON user_fcm_tokens
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
