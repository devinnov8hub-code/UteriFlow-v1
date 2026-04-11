

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS personality_type     text CHECK (personality_type IN ('cycle_sharer','health_optimizer','silent_tracker','community_seeker')),
  ADD COLUMN IF NOT EXISTS motivation_style     text CHECK (motivation_style IN ('gentle_reminders','data_driven','community_support','minimal_nudges')),
  ADD COLUMN IF NOT EXISTS notification_pref    text CHECK (notification_pref IN ('all','important_only','none')) DEFAULT 'important_only',
  ADD COLUMN IF NOT EXISTS avatar_url           text,
  ADD COLUMN IF NOT EXISTS bio                  text,
  ADD COLUMN IF NOT EXISTS cycle_length_avg     integer DEFAULT 28,
  ADD COLUMN IF NOT EXISTS period_length_avg    integer DEFAULT 5;


CREATE TABLE IF NOT EXISTS period_symptoms (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_id      uuid        REFERENCES period_logs(id) ON DELETE CASCADE,
  logged_date date        NOT NULL DEFAULT CURRENT_DATE,
  symptoms    text[]      NOT NULL DEFAULT '{}',
  flow_level  text        CHECK (flow_level IN ('spotting','light','medium','heavy','very_heavy')),
  mood        text[]      DEFAULT '{}',
  pain_level  integer     CHECK (pain_level BETWEEN 0 AND 10),
  notes       text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE period_symptoms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own symptoms" ON period_symptoms;
CREATE POLICY "Users manage own symptoms"
  ON period_symptoms FOR ALL TO authenticated USING (auth.uid() = user_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_period_symptoms_updated_at') THEN
    CREATE TRIGGER update_period_symptoms_updated_at
      BEFORE UPDATE ON period_symptoms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


CREATE TABLE IF NOT EXISTS cycle_predictions (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  predicted_start       date        NOT NULL,
  predicted_end         date,
  fertile_window_start  date,
  fertile_window_end    date,
  ovulation_date        date,
  cycle_number          integer     DEFAULT 1,
  is_current            boolean     DEFAULT true,
  created_at            timestamptz DEFAULT now()
);

ALTER TABLE cycle_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own predictions" ON cycle_predictions;
CREATE POLICY "Users view own predictions"
  ON cycle_predictions FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_predictions_user ON cycle_predictions(user_id);


CREATE TABLE IF NOT EXISTS notifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text        NOT NULL CHECK (type IN (
                'period_reminder','ovulation_reminder','cycle_summary',
                'community_reply','community_like','community_mention',
                'tip','system'
              )),
  title       text        NOT NULL,
  body        text        NOT NULL,
  data        jsonb       DEFAULT '{}',
  is_read     boolean     DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own notifications" ON notifications;
CREATE POLICY "Users manage own notifications"
  ON notifications FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;


CREATE TABLE IF NOT EXISTS post_likes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own likes" ON post_likes;
CREATE POLICY "Users manage own likes"
  ON post_likes FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_post_likes_post   ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user   ON post_likes(user_id);


CREATE TABLE IF NOT EXISTS comment_likes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid        NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own comment likes" ON comment_likes;
CREATE POLICY "Users manage own comment likes"
  ON comment_likes FOR ALL TO authenticated USING (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS post_bookmarks (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE post_bookmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own bookmarks" ON post_bookmarks;
CREATE POLICY "Users manage own bookmarks"
  ON post_bookmarks FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON post_bookmarks(user_id);


CREATE INDEX IF NOT EXISTS idx_symptoms_user    ON period_symptoms(user_id);
CREATE INDEX IF NOT EXISTS idx_symptoms_date    ON period_symptoms(user_id, logged_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'period_symptoms','cycle_predictions','notifications',
    'post_likes','comment_likes','post_bookmarks'
  )
ORDER BY tablename;

-- ── Add discharge column to period_symptoms (Screen 3 Figma) ──
ALTER TABLE period_symptoms
  ADD COLUMN IF NOT EXISTS discharge text CHECK (discharge IN ('dry', 'sticky', 'creamy', 'egg_white'));
