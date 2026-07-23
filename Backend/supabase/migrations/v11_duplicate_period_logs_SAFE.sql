-- ════════════════════════════════════════════════════════════════════════════
--  v11 (REVISED) — Safe cleanup of duplicate period logs
-- ════════════════════════════════════════════════════════════════════════════
--
--  ⚠️  THIS FILE REPLACES AN EARLIER VERSION THAT WAS UNSAFE.
--
--  The previous version merged any two period rows whose dates overlapped or
--  were adjacent. Run against real data, that merge CHAINED: 18 separate rows
--  for one user collapsed into a single 2026-07-03 .. 2026-07-23 record — a
--  21-day "period" that never happened. Do not run that version. It has been
--  removed from the migrations folder.
--
--  This version NEVER merges and NEVER edits a date. It only removes rows that
--  are byte-for-byte duplicates of another row (same user, same start date,
--  same end date), keeping the most recently created one. Anything ambiguous is
--  left alone and surfaced for a human to decide.
--
--  WHY THE DUPLICATES EXIST
--  ------------------------
--  POST /period/log used to INSERT on every save, and the edit screen posts
--  there. Each correction created another row while the original stayed behind.
--  The backend now updates the existing period instead, so no new duplicates
--  are being created — this only cleans up what accumulated beforehand.
-- ════════════════════════════════════════════════════════════════════════════


-- ── STEP 1: How bad is it? (read-only) ──────────────────────────────────────
SELECT
  user_id,
  start_date,
  end_date,
  COUNT(*)                      AS copies,
  MAX(created_at)               AS newest_kept,
  COUNT(*) - 1                  AS would_delete
FROM period_logs
GROUP BY user_id, start_date, end_date
HAVING COUNT(*) > 1
ORDER BY copies DESC, user_id, start_date;

-- Totals:
-- SELECT COUNT(*) AS groups, SUM(c - 1) AS rows_to_delete FROM (
--   SELECT COUNT(*) AS c FROM period_logs
--   GROUP BY user_id, start_date, end_date HAVING COUNT(*) > 1) x;


-- ── STEP 2: Back up first (recommended) ─────────────────────────────────────
-- CREATE TABLE IF NOT EXISTS period_logs_backup_v11 AS SELECT * FROM period_logs;
-- SELECT COUNT(*) FROM period_logs_backup_v11;


-- ── STEP 3: Delete EXACT duplicates only ────────────────────────────────────
-- Keeps the newest row in each (user, start_date, end_date) group and deletes
-- the rest. No dates are changed and no distinct period is removed, so this
-- cannot invent or destroy a cycle.
--
-- Uncomment to run, after steps 1 and 2.
--
-- WITH ranked AS (
--   SELECT id,
--          ROW_NUMBER() OVER (
--            PARTITION BY user_id, start_date, end_date
--            ORDER BY created_at DESC, id DESC
--          ) AS rn
--     FROM period_logs
-- )
-- DELETE FROM period_logs
--  WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
--
-- Re-run STEP 1 afterwards: it should return no rows.


-- ── STEP 4: Review what is left (read-only, MANUAL decision) ────────────────
-- After step 3 there may still be rows that overlap without being identical —
-- for example 2026-07-04..2026-07-07 alongside 2026-07-06..2026-07-09. These
-- are edit attempts that changed the dates, so only a human can say which was
-- intended. They are NOT deleted automatically.
--
-- Rule of thumb: within an overlapping group, the most recently created row is
-- usually what the user meant; the earlier ones are abandoned edits. Delete
-- them individually by id after checking.
--
SELECT
  a.user_id,
  a.id         AS row_id,
  a.start_date,
  a.end_date,
  a.created_at,
  COUNT(*) FILTER (
    WHERE b.id <> a.id
      AND b.start_date <= COALESCE(a.end_date, a.start_date)
      AND COALESCE(b.end_date, b.start_date) >= a.start_date
  ) AS overlaps_with
FROM period_logs a
JOIN period_logs b ON b.user_id = a.user_id
GROUP BY a.user_id, a.id, a.start_date, a.end_date, a.created_at
HAVING COUNT(*) FILTER (
    WHERE b.id <> a.id
      AND b.start_date <= COALESCE(a.end_date, a.start_date)
      AND COALESCE(b.end_date, b.start_date) >= a.start_date
  ) > 0
ORDER BY a.user_id, a.start_date, a.created_at;


-- ── Undo ────────────────────────────────────────────────────────────────────
-- TRUNCATE period_logs;
-- INSERT INTO period_logs SELECT * FROM period_logs_backup_v11;
