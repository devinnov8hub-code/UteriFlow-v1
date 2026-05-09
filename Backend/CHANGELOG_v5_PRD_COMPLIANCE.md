# UteriFlow v5 — PRD Compliance Release Notes

This release implements Bugs 1-4 from the Technical PRD (Daily Insights Engine,
Bugs, Fixes & Symptom Scenarios) without breaking any existing endpoints.

> **For the frontend dev:** every existing endpoint keeps its existing request/response
> shape. New fields are additive. New endpoints are clearly marked as NEW below.
> No deployed app build will break after this release; new app builds can opt
> into the richer engine output progressively.

---

## What changed at a glance

| Bug | Status | What was wrong | What's now in place |
|-----|--------|----------------|---------------------|
| **Bug 1** | ✅ Fixed | PCOS onboarding answer captured but never used by the engine | Canonical `pcos_status` column added; auto-synced both ways with the legacy `hormonal_status` column. PCOS users now route to PCOS insight track immediately. |
| **Bug 2** | ✅ Fixed | Onboarding cycle data lost (only midpoint integers stored, defaults to 28) | Raw `last_period_start` + range strings now persisted. **No more 28-day default** — null means "we don't know yet" and confidence drops accordingly. Post-onboarding null-check function added. |
| **Bug 3** | ✅ Fixed | No contraceptive question at onboarding; engine showed fertility content to users on the pill | New `POST /onboarding/contraceptive` endpoint. Hormonal types suppress ovulation predictions and fertile-window content from day 1. Mid-app updates via the `started_changed_contraceptive` symptom item. |
| **Bug 4** | ✅ Fixed | No way to log sexual activity | `protected_sex` and `unprotected_sex` are now valid items in the daily symptom checklist. Late-period + unprotected-sex pathway implemented per PRD §6 Scenario 6. PCOS users get no algorithmic weight from sexual-activity logs per Bug 4 fix (d). |

---

## Required deployment steps

1. **Run the new migration** in the Supabase SQL Editor:
   ```
   supabase/migrations/v5_prd_compliance.sql
   ```
   This adds `pcos_status`, `contraceptive_type`, `last_period_start`,
   `cycle_length_range`, `period_length_range`, `user_type`, `pcos_tier`,
   the `daily_insight_history` table, and an `onboarding_validation_check()`
   function. Existing data is backfilled — no manual migration needed.

2. **Deploy the backend** — no environment variable changes required.

3. **Frontend can integrate the new endpoints at its own pace.** The
   existing `POST /onboarding/hormonal-status` keeps working unchanged,
   and `GET /period/summary` still returns every legacy field. New clients
   should switch to `POST /onboarding/pcos-status` + `POST /onboarding/contraceptive`
   and read the `engine` block under `/period/summary`.

---

## New endpoints

### `POST /api/v1/onboarding/pcos-status` (Bug 1)
PRD-canonical PCOS field. Use either this OR the legacy `/hormonal-status`
endpoint — both keep both columns in sync.
```json
{ "pcosStatus": "confirmed" }   // confirmed | suspected | none
```

### `POST /api/v1/onboarding/contraceptive` (Bug 3)
The missing onboarding question. **Hormonal types** (`combined_pill`,
`mini_pill`, `hormonal_iud`, `implant`, `injectable`, `other_hormonal`)
trigger immediate ovulation suppression in the engine.
```json
{ "contraceptiveType": "combined_pill" }
```

### `GET /api/v1/period/phase` (NEW)
PRD Phase Engine output for the current day. Returns phase, confidence,
user type, PCOS tier, contraceptive state, late-period pathway state.
Calendar-based for REGULAR/IRREGULAR users; symptom-inferred for PCOS users
per PRD Rule 5.

### `GET /api/v1/period/daily-insight` (NEW)
The Daily Insight Engine — runs the full PRD §5 selection pipeline and
returns one personalised insight card. Uses 14-day cooldown via the new
`daily_insight_history` table.

Query param `?record=false` lets the client preview without affecting cooldown.

---

## Existing endpoints — backward-compatible additions

### `POST /api/v1/period/symptoms`
- `symptoms[]` enum extended with: `protected_sex`, `unprotected_sex`,
  `started_changed_contraceptive`, `high_libido`, `excess_hair`,
  `hair_thinning`, `weight_gain_difficulty`, `skin_darkening`.
- `discharge` enum extended with `watery` (PRD §4.4 ovulation inference).
- New optional request field: `contraceptiveType` — only meaningful when
  `symptoms[]` includes `started_changed_contraceptive`. Updates the user's
  contraceptive in the same request and re-routes the engine.
- New response flag: `promptContraceptiveType: true` — fires when the
  contraceptive-change item was logged but no `contraceptiveType` was supplied.
  Frontend should ask the user which method.
- **`loggedDate` accepts past dates** (back-fill workflow). Future dates rejected.

### `POST /api/v1/onboarding/hormonal-status`
Now also writes the canonical `pcos_status` field. Response includes
`pcosStatus` derived from `hormonalStatus`.

### `POST /api/v1/onboarding/cycle-info`
- Now persists `last_period_start`, `cycle_length_range`, `period_length_range`
  on the profile in addition to seeding `period_logs`.
- **No longer defaults to 28 days when cycle length is omitted.** Field stays NULL.
- Response now includes the resolved averages (or null).

### `POST /api/v1/onboarding/period-regularity`
Non-regular answers (`varies_week`, `unpredictable`, `not_tracked`) immediately
classify the user as `IRREGULAR` instead of waiting for cycle data.

### `GET /api/v1/period/summary`
- Existing fields unchanged.
- `cyclePhase` enum extended with `late` and `contraceptive_suppressed`.
  Older clients can treat them as `unknown`.
- `prediction` is now `null` for hormonal contraceptive users (Bug 3 fix b).
- New top-level `engine` block contains the full PRD output:
  ```
  engine: {
    phase, phaseSource, phaseDetails, userType, pcosStatus, pcosTier,
    pcosFlags, confidence, cycleDay, daysSinceLastPeriod, stats,
    contraceptive: { type, isHormonal, ovulationSuppressed },
    latePeriodPathway: { triggered, reason, daysLate?, fertileWindow? }
  }
  ```

### `GET /api/v1/period/prediction`
- Returns `prediction: null, suppressed: true, suppressedReason: "hormonal_contraceptive"`
  for hormonal users instead of fabricating a fertile window.
- Returns `prediction: null` (no error) when neither measured nor onboarding
  data is available — never assumes 28 days.

### `GET /api/v1/period/insights`
Unchanged. Schema's `cycleLengthAvg` is now nullable per Rule 1.

### `PATCH /api/v1/profile`
- Accepts `contraceptiveType` and `pcosStatus` for in-app settings updates.

---

## New schemas (referenced from Swagger paths)

- `PhaseEnum` — canonical PRD phase enum
- `EngineStats` — avg/min/max cycle, std dev, cycles used
- `EngineContext` — full engine output (used by `/summary.engine` and `/phase`)
- `DailyInsight` — selected insight card metadata
- `LatePeriodPathway` — late-period + unprotected-sex pathway state
- `InferredPhase` — symptom-intelligence engine output
- `ContraceptiveState` — type + isHormonal + suppression flag

---

## Module map

```
src/
├── utils/
│   ├── cycleEngine.js         # NEW — pure functions: phase math, PCOS flags,
│   │                          #       user-type classification, late-period pathway
│   └── insightEngine.js       # NEW — content library + selection pipeline
├── routes/
│   ├── onboarding.js          # Modified — Bugs 1, 2, 3 fixes; +/pcos-status, +/contraceptive
│   └── period.js              # Modified — engine integration; +/phase, +/daily-insight
├── validators/
│   └── index.js               # Modified — extended symptom enum, new validators
└── config/
    └── swagger.js             # Modified — full PRD docs added

supabase/migrations/
└── v5_prd_compliance.sql      # NEW — additive schema migration (run in Supabase SQL Editor)
```

---

## What's still on the frontend's plate

Per the PRD, these items are explicitly frontend work:

1. **Add the contraceptive question to the onboarding flow** (one extra screen),
   wired to `POST /onboarding/contraceptive`.
2. **Add `Protected sex` and `Unprotected sex` to the daily symptom checklist**,
   alongside cramps/fatigue/etc. They flow through the existing
   `POST /period/symptoms` endpoint.
3. **Add `Started or changed contraceptive today` to the symptom checklist.**
   When tapped, follow up with a contraceptive-method selector and send both
   in the same `POST /period/symptoms` request body (`symptoms[]` includes
   the item, top-level `contraceptiveType` carries the new method).
4. **Render the new `engine` block on the home screen** when present —
   it provides phase, confidence, PCOS tier, and the late-period pathway
   trigger that the home-screen card needs.
5. **Surface a one-time prompt when `pcosLikelyFirstSeen=true`** in
   the `/daily-insight` response (PRD §6 Scenario 7).
6. **Hide ovulation/fertile UI when `engine.contraceptive.ovulationSuppressed=true`**
   or `cyclePhase === 'contraceptive_suppressed'`.

---

## What's NOT in v1.0 (per PRD §3 Bug 3 fix d)

- General medication tracking (metformin, antidepressants, etc.) — explicitly
  out of scope for v1.0. Revisit in v2.0.
- Wearable temperature integration — out of scope unless a compatible wearable
  is connected (PRD §4.1 daily log).
