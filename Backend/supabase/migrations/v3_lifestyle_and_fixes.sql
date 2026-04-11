-- ═══════════════════════════════════════════════════════════════
-- v3: Lifestyle articles table + bug fixes
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Fix pain_level constraint to allow 0 (UI "None" option) ──
ALTER TABLE period_symptoms
  DROP CONSTRAINT IF EXISTS period_symptoms_pain_level_check;

ALTER TABLE period_symptoms
  ADD CONSTRAINT period_symptoms_pain_level_check CHECK (pain_level BETWEEN 0 AND 10);


-- ── 2. Fix posts RLS — ensure authenticated users can read all published posts ──
DROP POLICY IF EXISTS "posts_select" ON posts;

CREATE POLICY "posts_select"
  ON posts FOR SELECT TO authenticated
  USING (true);   -- RLS row-level: is_published filter handled in app query


-- ── 3. Lifestyle articles table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS lifestyle_articles (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text        NOT NULL,
  summary      text,
  content      text        NOT NULL DEFAULT '',
  image_url    text,
  category     text        NOT NULL DEFAULT 'Daily Habits'
               CHECK (category IN ('Daily Habits', 'Stress Management', 'Cycle Care')),
  read_time    integer     DEFAULT 4,   -- estimated read time in minutes
  is_published boolean     DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE lifestyle_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lifestyle_select" ON lifestyle_articles;
CREATE POLICY "lifestyle_select"
  ON lifestyle_articles FOR SELECT TO authenticated
  USING (is_published = true);

-- Allow admins (service role) to manage articles
DROP POLICY IF EXISTS "lifestyle_admin" ON lifestyle_articles;
CREATE POLICY "lifestyle_admin"
  ON lifestyle_articles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_lifestyle_category   ON lifestyle_articles(category);
CREATE INDEX IF NOT EXISTS idx_lifestyle_published  ON lifestyle_articles(is_published);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_lifestyle_articles_updated_at') THEN
    CREATE TRIGGER update_lifestyle_articles_updated_at
      BEFORE UPDATE ON lifestyle_articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- ── 4. Seed sample lifestyle articles ────────────────────────────
INSERT INTO lifestyle_articles (title, summary, content, category, read_time, image_url) VALUES
(
  'Understanding Your Cycle with PCOS',
  'Learn how irregular cycles work and what your body is telling you.',
  'If you have PCOS, your cycle may not follow the typical monthly pattern—and that''s okay. Unlike regular cycles, which often occur every 21–35 days, PCOS can cause cycles to be longer, irregular, or sometimes skipped altogether.

This happens because hormonal imbalances can affect ovulation. When ovulation is delayed or doesn''t occur, your period may come later than expected or be unpredictable.

Tracking your cycle can help you better understand your body. By logging your period, symptoms, and changes like discharge or mood, you can begin to notice patterns over time—even if they aren''t perfectly regular.

Remember, every body is different. Your cycle doesn''t need to be "perfect" to be valid. With consistent tracking and awareness, you can gain clearer insights and feel more in control of your health.',
  'Cycle Care',
  4,
  NULL
),
(
  'Why Your Cycle Length Changes',
  'Explore common reasons behind long or unpredictable cycles.',
  'Cycle length can vary for many reasons—stress, sleep, diet, illness, or hormonal shifts. Understanding why your cycle fluctuates helps you respond to your body rather than worry about it.

A "normal" cycle ranges from 21 to 35 days, but for those with PCOS or other hormonal conditions, it can stretch much longer. Track each cycle start date consistently and over time patterns will emerge.

If your cycle is consistently under 21 days or over 45 days, consider speaking with a healthcare provider.',
  'Cycle Care',
  3,
  NULL
),
(
  'Tracking Your Symptoms Effectively',
  'Simple ways to log and understand patterns in your body.',
  'Effective symptom tracking goes beyond just noting your period start and end. Log daily details like flow intensity, discharge type, mood, energy levels, sleep quality, and any physical discomfort.

Over several cycles, these logs become a powerful dataset. You may notice that headaches appear a few days before your period, or that your energy peaks mid-cycle. These patterns are signals from your body.

Use the symptom tracker every day—even on non-period days. Consistency is what turns data into insight.',
  'Daily Habits',
  3,
  NULL
),
(
  'Managing Stress to Support Your Cycle',
  'How stress hormones affect your period and what you can do.',
  'Cortisol—your primary stress hormone—directly competes with progesterone and can suppress ovulation. Chronic stress is one of the most common reasons for missed or delayed periods.

Practices like deep breathing, gentle movement, adequate sleep, and time in nature can all lower cortisol levels. You don''t need a perfect routine—small, consistent habits make a real difference.

Track your stress levels alongside your cycle to spot correlations. Many people notice that stressful months correspond with longer or more symptomatic cycles.',
  'Stress Management',
  4,
  NULL
),
(
  'Nutrition Tips During Your Cycle',
  'Foods that support hormonal balance throughout the month.',
  'Your nutritional needs shift throughout your cycle. During menstruation, iron-rich foods like leafy greens, legumes, and seeds help replace what is lost. Pairing them with Vitamin C improves absorption.

In the follicular phase, lighter and fresher foods support rising estrogen. The luteal phase—the two weeks before your period—often brings cravings. Magnesium-rich foods like dark chocolate, nuts, and bananas can ease PMS symptoms.

Staying hydrated and reducing processed foods, especially in the week before your period, can reduce bloating and mood swings significantly.',
  'Daily Habits',
  5,
  NULL
)
ON CONFLICT DO NOTHING;
