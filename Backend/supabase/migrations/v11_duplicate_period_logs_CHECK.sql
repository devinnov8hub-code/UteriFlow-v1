-- ════════════════════════════════════════════════════════════════════════════
--  v11 — Duplicate period logs: INSPECTION FIRST, cleanup only if you choose
-- ════════════════════════════════════════════════════════════════════════════
--
--  ⚠️  READ THIS BEFORE RUNNING ANYTHING BELOW.
--
--  Unlike the other migrations in this folder, this file is NOT safe to run
--  blindly. Step 1 is read-only. Steps 2 and 3 modify data and are commented
--  out on purpose — uncomment them only after you have looked at the output of
--  step 1 and are satisfied with what would be removed.
--
--  WHY THIS EXISTS
--  ---------------
--  POST /period/log used to INSERT a new row on every save. The app's "edit
--  period" screen posts to that endpoint, so each time a user corrected their
--  period start or end date a SECOND row was created and the original stayed
--  behind. The old row is why the previous start date kept reappearing after
--  an edit.
--
--  The backend now updates the existing period instead of inserting, so NO NEW
--  duplicates will be created. This file only deals with rows created before
--  that fix. If step 1 returns no rows, there is nothing to clean up and you
--  can ignore the rest of this file.
-- ════════════════════════════════════════════════════════════════════════════


-- ── STEP 1: INSPECT (read-only — safe to run) ───────────────────────────────
-- Lists period logs that overlap or sit within a day of another log for the
-- same user. These are the pairs the old blind-insert behaviour produced.
WITH overlapping AS (
  SELECT
    a.user_id,
    a.id            AS keep_id,
    a.start_date    AS keep_start,
    a.end_date      AS keep_end,
    b.id            AS dup_id,
    b.start_date    AS dup_start,
    b.end_date      AS dup_end,
    a.created_at    AS keep_created,
    b.created_at    AS dup_created
  FROM period_logs a
  JOIN period_logs b
    ON  a.user_id = b.user_id
    AND a.id <> b.id
    -- b starts within a day of a's range (overlap or adjacent)
    AND b.start_date <= COALESCE(a.end_date, a.start_date) + 1
    AND COALESCE(b.end_date, b.start_date) >= a.start_date - 1
    -- keep the most recently created row of each pair; list the other as the duplicate
    AND a.created_at > b.created_at
)
SELECT
  user_id,
  keep_id, keep_start, keep_end, keep_created,
  dup_id,  dup_start,  dup_end,  dup_created
FROM overlapping
ORDER BY user_id, keep_start DESC;

-- How many users are affected, and how many rows would be removed:
--   SELECT COUNT(DISTINCT user_id) AS users_affected, COUNT(*) AS rows_to_remove
--     FROM ( ...paste the WITH query above... ) x;


-- ── STEP 2: BACK UP BEFORE CHANGING ANYTHING (recommended) ──────────────────
-- Creates a full copy of the table so any cleanup can be undone.
-- Uncomment to run.
--
-- CREATE TABLE IF NOT EXISTS period_logs_backup_v11 AS
--   SELECT * FROM period_logs;
--
-- Verify: SELECT COUNT(*) FROM period_logs_backup_v11;


-- ── STEP 3: MERGE DUPLICATES (destructive — review step 1 output first) ─────
-- For each overlapping pair this widens the surviving row to cover the full
-- span of both, then deletes the older duplicate. Widening first means no
-- recorded day is ever lost.
--
-- Uncomment ONLY after running steps 1 and 2.
--
-- WITH overlapping AS (
--   SELECT a.id AS keep_id, b.id AS dup_id,
--          LEAST(a.start_date, b.start_date) AS merged_start,
--          GREATEST(COALESCE(a.end_date, a.start_date),
--                   COALESCE(b.end_date, b.start_date)) AS merged_end
--   FROM period_logs a
--   JOIN period_logs b
--     ON  a.user_id = b.user_id
--     AND a.id <> b.id
--     AND b.start_date <= COALESCE(a.end_date, a.start_date) + 1
--     AND COALESCE(b.end_date, b.start_date) >= a.start_date - 1
--     AND a.created_at > b.created_at
-- )
-- UPDATE period_logs p
--    SET start_date = o.merged_start,
--        end_date   = o.merged_end
--   FROM overlapping o
--  WHERE p.id = o.keep_id;
--
-- DELETE FROM period_logs
--  WHERE id IN (
--    SELECT b.id
--      FROM period_logs a
--      JOIN period_logs b
--        ON  a.user_id = b.user_id
--        AND a.id <> b.id
--        AND b.start_date <= COALESCE(a.end_date, a.start_date) + 1
--        AND COALESCE(b.end_date, b.start_date) >= a.start_date - 1
--        AND a.created_at > b.created_at
--  );
--
-- After cleanup, re-run STEP 1: it should return no rows.
--
-- To undo:
--   TRUNCATE period_logs;
--   INSERT INTO period_logs SELECT * FROM period_logs_backup_v11;
