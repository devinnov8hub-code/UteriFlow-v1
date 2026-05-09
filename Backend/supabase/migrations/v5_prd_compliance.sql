-- ═══════════════════════════════════════════════════════════════
-- v5 migration: PRD Compliance — Bugs 1-4 Fixes
--
-- Fixes:
--   Bug 1: PCOS onboarding data not captured/used  → adds pcos_status
--   Bug 2: Cycle details not stored correctly      → adds last_period_start,
--          cycle_length_range, period_length_range, drops 28-day default
--   Bug 3: Contraceptive use not captured          → adds contraceptive_type
--   Bug 4: Sexual activity not in symptom log      → no schema change (symptoms
--          is text[], app-level enum extended in validators)
--
-- All changes are ADDITIVE — existing columns/data are NOT removed.
-- Run this in Supabase SQL Editor AFTER v4_fix_comments_rls.sql
-- ═══════════════════════════════════════════════════════════════

-- ── 1. PCOS status (Bug 1) ───────────────────────────────────────
-- The existing `hormonal_status` column stays in place to avoid breaking
-- production clients. `pcos_status` is the canonical PRD field used by the
-- insight engine. The two are synced bidirectionally in the application
-- layer (see src/utils/cycleEngine.js → mapHormonalToPcos).
--
-- Vocabulary mapping:
--   hormonal_status='diagnosed' ↔ pcos_status='confirmed'
--   hormonal_status='suspected' ↔ pcos_status='suspected'
--   hormonal_status='not_sure'  ↔ pcos_status='none'  (no algorithmic weight until upgraded)
--   hormonal_status='no'        ↔ pcos_status='none'
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS pcos_status text
    CHECK (pcos_status IN ('confirmed','suspected','none'));

-- Backfill from existing hormonal_status for users already in the system
UPDATE user_profiles
   SET pcos_status = CASE
     WHEN hormonal_status = 'diagnosed' THEN 'confirmed'
     WHEN hormonal_status = 'suspected' THEN 'suspected'
     WHEN hormonal_status IN ('not_sure','no') THEN 'none'
     ELSE NULL
   END
 WHERE pcos_status IS NULL AND hormonal_status IS NOT NULL;


-- ── 2. Onboarding cycle baseline (Bug 2) ─────────────────────────
-- Preserves the user's onboarding answers verbatim, even after they start
-- logging real periods. Range strings keep the user's chosen bucket so the
-- UI can re-show their selection in profile/settings.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS last_period_start    date,
  ADD COLUMN IF NOT EXISTS cycle_length_range   text
    CHECK (cycle_length_range IN ('lt_21','21_35','36_60','gt_60')),
  ADD COLUMN IF NOT EXISTS period_length_range  text
    CHECK (period_length_range IN ('1_2','3_5','6_8','9_plus'));

-- Drop the misleading 28 / 5 defaults on cycle_length_avg and period_length_avg.
-- PRD Rule: "Never default to 28. If the user does not provide it, store null."
-- Existing rows that already have 28/5 are left alone (they may have been
-- explicitly set during onboarding); only NEW rows will default to NULL going
-- forward. The application layer must treat NULL as "not yet known" and emit
-- low-confidence insights instead of pretending it knows the cycle length.
ALTER TABLE user_profiles ALTER COLUMN cycle_length_avg  DROP DEFAULT;
ALTER TABLE user_profiles ALTER COLUMN period_length_avg DROP DEFAULT;


-- ── 3. Contraceptive type (Bug 3) ────────────────────────────────
-- Hormonal contraceptive users have suppressed natural cycles. The insight
-- engine must NEVER show ovulation predictions or fertile-window content to
-- them. See src/utils/cycleEngine.js → isHormonalContraceptive().
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS contraceptive_type text
    CHECK (contraceptive_type IN (
      'none',                  -- "No hormonal contraceptive"
      'combined_pill',
      'mini_pill',             -- progestogen-only
      'hormonal_iud',          -- e.g. Mirena
      'implant',
      'injectable',
      'other_hormonal',
      'prefer_not_to_say'
    ));

-- Track when contraceptive was last changed (so the engine can date-bound
-- which cycles to use for averaging — pre-contraceptive cycles aren't
-- representative once a user starts hormonal birth control).
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS contraceptive_changed_at timestamptz;


-- ── 4. Cached user_type classification ───────────────────────────
-- Recomputed by the application after every period log / onboarding change.
-- Cached here so admin dashboards and analytics can filter without re-running
-- the cycle engine for every row.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS user_type text
    CHECK (user_type IN ('REGULAR','IRREGULAR','PCOS'));


-- ── 5. PCOS tier (Confidence engine) ─────────────────────────────
-- Internal app-side classification distinct from user-declared pcos_status.
-- See PRD Appendix A → Tier Assignment Rules.
--   none    = no flags triggered
--   possible= 2+ cycle flags only OR 2+ symptom flags only
--   likely  = 2+ cycle flags AND 1+ symptom flags
--   confirmed = pcos_status='confirmed' (user told us)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS pcos_tier text
    CHECK (pcos_tier IN ('none','possible','likely','confirmed'))
    DEFAULT 'none';


-- ── 6. Daily insight cooldown table ──────────────────────────────
-- Tracks which insight cards have been shown to which users on which dates,
-- so the selection pipeline can apply the 14-day cooldown rule without
-- re-deriving it from notification history.
CREATE TABLE IF NOT EXISTS daily_insight_history (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_key text        NOT NULL,    -- stable identifier for the insight card
  shown_date  date        NOT NULL DEFAULT CURRENT_DATE,
  phase       text,                    -- which phase the user was in when shown
  pcos_tier   text,                    -- snapshot at time of display
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE daily_insight_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own insight history" ON daily_insight_history;
CREATE POLICY "Users view own insight history"
  ON daily_insight_history FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_insight_history_user_date
  ON daily_insight_history(user_id, shown_date DESC);

CREATE INDEX IF NOT EXISTS idx_insight_history_user_key
  ON daily_insight_history(user_id, insight_key);


-- ── 7. Onboarding validation: post-onboarding null-check helper ──
-- Bug 2 fix (b): expose a SQL function the application can call after
-- onboarding completion to verify all required fields landed in the row.
-- Returns the list of missing required fields, empty array if all present.
CREATE OR REPLACE FUNCTION onboarding_validation_check(p_user_id uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  missing text[] := ARRAY[]::text[];
  rec     record;
BEGIN
  SELECT last_period_start,
         cycle_regularity,
         pcos_status,
         contraceptive_type
    INTO rec
    FROM user_profiles
   WHERE id = p_user_id;

  IF rec IS NULL THEN
    RETURN ARRAY['profile_not_found'];
  END IF;

  IF rec.last_period_start  IS NULL THEN missing := array_append(missing, 'last_period_start');  END IF;
  IF rec.cycle_regularity   IS NULL THEN missing := array_append(missing, 'cycle_regularity');   END IF;
  IF rec.pcos_status        IS NULL THEN missing := array_append(missing, 'pcos_status');        END IF;
  IF rec.contraceptive_type IS NULL THEN missing := array_append(missing, 'contraceptive_type'); END IF;

  RETURN missing;
END;
$$;


-- ── 8. Verification ──────────────────────────────────────────────
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_name = 'user_profiles'
   AND column_name IN (
     'pcos_status','contraceptive_type','contraceptive_changed_at',
     'last_period_start','cycle_length_range','period_length_range',
     'user_type','pcos_tier'
   )
 ORDER BY column_name;

SELECT tablename FROM pg_tables
 WHERE schemaname = 'public' AND tablename = 'daily_insight_history';
