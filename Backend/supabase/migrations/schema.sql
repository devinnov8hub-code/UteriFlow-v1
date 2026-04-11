
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';


CREATE TABLE IF NOT EXISTS user_profiles (
  id                      uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                   text        NOT NULL,
  display_name            text,
  age_group               text        CHECK (age_group IN ('15-29', '30-34', '35-39', '40-44', '45-49', '50-55')),
  hormonal_status         text        CHECK (hormonal_status IN ('diagnosed','suspected','not_sure','no')),
  period_regularity       text        CHECK (period_regularity IN ('regular','varies_week','unpredictable','not_tracked')),
  health_focus            text[]      DEFAULT '{}',
  onboarding_completed    boolean     DEFAULT false,
  onboarding_completed_at timestamptz,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_profiles_updated_at') THEN
    CREATE TRIGGER update_user_profiles_updated_at
      BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


CREATE TABLE IF NOT EXISTS email_verifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text        NOT NULL,
  otp_code   text        NOT NULL,
  expires_at timestamptz NOT NULL,
  verified   boolean     DEFAULT false,
  attempts   integer     DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages verifications" ON email_verifications;
DROP POLICY IF EXISTS "Allow anon read own verification" ON email_verifications;
DROP POLICY IF EXISTS "Allow anon insert verification" ON email_verifications;


CREATE POLICY "Anyone can insert verifications"
  ON email_verifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read verifications"
  ON email_verifications FOR SELECT USING (true);
CREATE POLICY "Anyone can update verifications"
  ON email_verifications FOR UPDATE USING (true);


CREATE TABLE IF NOT EXISTS period_logs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date date        NOT NULL,
  end_date   date,
  notes      text,
  is_first_log boolean   DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE period_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own period logs" ON period_logs;

CREATE POLICY "Users manage own period logs"
  ON period_logs FOR ALL TO authenticated USING (auth.uid() = user_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_period_logs_updated_at') THEN
    CREATE TRIGGER update_period_logs_updated_at
      BEFORE UPDATE ON period_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


DROP TABLE IF EXISTS user_bans CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS posts CASCADE;

CREATE TABLE posts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  title        text        NOT NULL,
  content      text        NOT NULL,
  image_url    text,
  category     text        NOT NULL DEFAULT 'community'
                           CHECK (category IN ('community','lifestyle_tips','discord')),
  likes_count  integer     DEFAULT 0,
  shares_count integer     DEFAULT 0,
  is_flagged   boolean     DEFAULT false,
  is_published boolean     DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_select"
  ON posts FOR SELECT TO authenticated USING (true);

CREATE POLICY "posts_insert"
  ON posts FOR INSERT TO authenticated
  WITH CHECK (author_id IS NULL OR auth.uid() = author_id);

CREATE POLICY "posts_update"
  ON posts FOR UPDATE TO authenticated
  USING (author_id IS NULL OR auth.uid() = author_id);

CREATE POLICY "posts_delete"
  ON posts FOR DELETE TO authenticated
  USING (author_id IS NULL OR auth.uid() = author_id);

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


CREATE TABLE comments (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       uuid        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  parent_id     uuid        REFERENCES comments(id) ON DELETE CASCADE,
  content       text        NOT NULL,
  is_flagged    boolean     DEFAULT false,
  likes_count   integer     DEFAULT 0,
  replies_count integer     DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_select"
  ON comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "comments_insert"
  ON comments FOR INSERT TO authenticated
  WITH CHECK (author_id IS NULL OR auth.uid() = author_id);

CREATE POLICY "comments_delete"
  ON comments FOR DELETE TO authenticated
  USING (author_id IS NULL OR auth.uid() = author_id);

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


CREATE TABLE user_bans (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  banned_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  reason       text,
  ban_type     text        NOT NULL DEFAULT 'temporary'
                           CHECK (ban_type IN ('temporary','permanent')),
  banned_until timestamptz,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE user_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bans_all"
  ON user_bans FOR ALL TO authenticated USING (true) WITH CHECK (true);


CREATE INDEX IF NOT EXISTS idx_posts_author    ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_category  ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_flagged   ON posts(is_flagged) WHERE is_flagged = true;
CREATE INDEX IF NOT EXISTS idx_comments_post   ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_bans_user       ON user_bans(user_id);


SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_profiles','email_verifications','period_logs','posts','comments','user_bans')
ORDER BY tablename;
