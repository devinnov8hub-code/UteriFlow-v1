-- ============================================================
-- UteriFlow Database Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── User Profiles ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  display_name text,
  age_group text,
  hormonal_status text,
  period_regularity text,
  health_focus jsonb DEFAULT '[]'::jsonb,
  onboarding_completed boolean DEFAULT false,
  onboarding_completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ── Email Verifications ────────────────────────────────────
-- purpose: 'registration' | 'password_reset'
CREATE TABLE IF NOT EXISTS email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  attempts integer DEFAULT 0,
  purpose text NOT NULL DEFAULT 'registration',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create email verification"
  ON email_verifications FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read email verification"
  ON email_verifications FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can update email verification"
  ON email_verifications FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

-- ── Period Logs ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS period_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date,
  notes text,
  is_first_log boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE period_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own period logs"
  ON period_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own period logs"
  ON period_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own period logs"
  ON period_logs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own period logs"
  ON period_logs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON email_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_verifications_purpose ON email_verifications(purpose);
CREATE INDEX IF NOT EXISTS idx_period_logs_user_id ON period_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_period_logs_start_date ON period_logs(start_date);

-- ── Auto-update updated_at ─────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_profiles_updated_at') THEN
    CREATE TRIGGER update_user_profiles_updated_at
      BEFORE UPDATE ON user_profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_period_logs_updated_at') THEN
    CREATE TRIGGER update_period_logs_updated_at
      BEFORE UPDATE ON period_logs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ── Admin RLS Policies ─────────────────────────────────────
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'is_admin' = 'true');

CREATE POLICY "Admins can view all period logs"
  ON period_logs FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'is_admin' = 'true');
