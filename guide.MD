# UteriFlow Backend v5 — Frontend Integration Guide

What changed, what to validate, and how to use it.




## 1. The short version

Four bugs from the PRD are now fixed on the backend. To make them work end-to-end, the app needs four small changes:

1. Add a contraceptive question to onboarding.
2. Add three new items to the daily symptom checklist.
3. Read a new `engine` block from the dashboard summary.
4. Render a one-time PCOS prompt when the backend signals it.

That's it. Existing screens keep working with no edits. Pick up the new fields when you have time.

---

## 2. What is unchanged

Every endpoint you already call still returns the same response shape. You will not see any field you used to read disappear. You will see new fields added next to the old ones — read them when ready, ignore them otherwise.

The only behavioural change to existing endpoints:

- `GET /period/prediction` now returns `prediction: null` when the user is on hormonal birth control. The response also includes `suppressed: true`. Treat this the same way you treat "no prediction yet" — do not show fertile-window UI.
- `GET /period/summary` may now return `cyclePhase: "contraceptive_suppressed"` or `cyclePhase: "late"`. Treat unknown values as `"unknown"` and you will be safe.
- `cycleLengthAvg` and `periodLengthAvg` may now be `null` for some users. Stop assuming 28 / 5. Show "still learning your cycle" copy when null.

---

## 3. New onboarding endpoints

### 3.1 Contraceptive question — REQUIRED new screen

Add one screen to the onboarding flow. Suggested copy:

> Are you currently using any hormonal contraception?

Options to map to the API value:

| User-facing label | API value |
|---|---|
| No, none of these | `none` |
| Combined pill | `combined_pill` |
| Mini-pill | `mini_pill` |
| Hormonal IUD (e.g. Mirena) | `hormonal_iud` |
| Implant | `implant` |
| Injection | `injectable` |
| Other hormonal method | `other_hormonal` |
| Prefer not to say | `prefer_not_to_say` |

Request:

```
POST /api/v1/onboarding/contraceptive
Authorization: Bearer <token>
Content-Type: application/json

{
  "contraceptiveType": "combined_pill"
}
```

Validation rules:
- `contraceptiveType` is required.
- Must be exactly one of the eight values above. Anything else gives a 400.

Why it matters: when the value is hormonal (anything except `none` and `prefer_not_to_say`), the backend will stop showing ovulation predictions and fertile-window content for that user. You do not need to do anything extra — just send the value.

### 3.2 PCOS status — preferred over the legacy endpoint

Same data as the existing `/onboarding/hormonal-status`, simpler vocabulary. Use either one — they keep each other in sync. New code should use this:

```
POST /api/v1/onboarding/pcos-status
{
  "pcosStatus": "confirmed"   // confirmed | suspected | none
}
```

Validation: `pcosStatus` is required, must be one of the three values.

If you keep using `/hormonal-status`, the response now also includes `pcosStatus` so you can show the user-friendly value back.

---

## 4. Daily symptom checklist — three new items

The existing `POST /period/symptoms` endpoint accepts three new values in the `symptoms[]` array. They are logged exactly like cramps or fatigue — single tap, no separate screen.

| New checklist item | API value | Notes |
|---|---|---|
| Protected sex | `protected_sex` | Logged like any symptom |
| Unprotected sex | `unprotected_sex` | Used for late-period pathway |
| Started or changed contraceptive today | `started_changed_contraceptive` | See 4.1 below |

There are also five new symptoms used by the PCOS detection engine. Add them to the checklist if you want — they unlock more accurate insights:

`high_libido`, `excess_hair`, `hair_thinning`, `weight_gain_difficulty`, `skin_darkening`

The `discharge` enum gained one value: `watery`. Add this to the existing discharge picker if you have one.

### 4.1 Contraceptive change — two-step flow in one request

When the user taps "Started or changed contraceptive today", the app should immediately ask which method, then send both pieces in one request:

```
POST /api/v1/period/symptoms
{
  "loggedDate": "2026-05-09",
  "symptoms": ["started_changed_contraceptive"],
  "contraceptiveType": "hormonal_iud"
}
```

Validation:
- `contraceptiveType` is optional, but you should send it.
- If you send the symptom item without `contraceptiveType`, the response will include `promptContraceptiveType: true`. That is your signal to ask the user and call the endpoint again.

If `contraceptiveType` is sent, the response will include `contraceptiveUpdated: true`.

### 4.2 Past-date logging

`loggedDate` accepts any past date so users can back-fill missed logs. Future dates are rejected with a 400. The endpoint is upsert-style — posting again for the same date overwrites instead of duplicating.

```
{
  "loggedDate": "2026-05-03",   // 6 days ago, fine
  "symptoms": ["cramps", "fatigue"]
}
```

---

## 5. The new `engine` block on the dashboard

`GET /period/summary` now returns an extra `engine` object alongside the existing fields. Read from it when you want richer output. Ignore it if you don't.

```
GET /api/v1/period/summary

{
  "summary": {
    "userName": "Tyress",
    "cyclePhase": "fertile",
    "daysUntilPeriod": 14,
    "prediction": { ... },
    "lastPeriod": { ... },
    "todaySymptoms": { ... },
    "personalizedTip": "...",
    "profile": { ... },

    "engine": {
      "phase": "OVULATION",
      "phaseSource": "calendar",
      "userType": "REGULAR",
      "pcosStatus": "none",
      "pcosTier": "none",
      "pcosFlags": [],
      "confidence": "high",
      "cycleDay": 14,
      "daysSinceLastPeriod": 14,
      "stats": {
        "avgCycleLength": 29,
        "avgBleedLength": 5,
        "stdDev": 1.2,
        "cyclesUsed": 4
      },
      "contraceptive": {
        "type": "none",
        "isHormonal": false,
        "ovulationSuppressed": false
      },
      "latePeriodPathway": {
        "triggered": false,
        "reason": "not_late_enough"
      }
    }
  }
}
```

Field reference:

| Field | Type | What it means |
|---|---|---|
| `engine.phase` | string \| null | Canonical phase: `MENSTRUAL`, `FOLLICULAR`, `OVULATION`, `LUTEAL`, `LATE`, or null |
| `engine.userType` | string | `REGULAR`, `IRREGULAR`, or `PCOS` |
| `engine.pcosTier` | string | `none`, `possible`, `likely`, or `confirmed` |
| `engine.confidence` | string | `high`, `medium-high`, `medium`, `low`, or `none` — show uncertainty visually when not `high` |
| `engine.cycleDay` | int \| null | Day in current cycle, 1-indexed |
| `engine.contraceptive.ovulationSuppressed` | bool | When true, hide all fertility/ovulation UI |

Rule of thumb for the home screen:

```
if (engine.contraceptive.ovulationSuppressed) {
  // hide fertile window, hide ovulation date
  // show contraceptive-aware content
}

if (engine.confidence === "low" || engine.confidence === "none") {
  // show "still learning your cycle" instead of confident dates
}
```

---

## 6. Two new read-only endpoints

You don't have to call these — `/summary` already includes the same data inside `engine`. But they're available if you want a single-purpose call.

### 6.1 GET /period/phase

Just the phase + classification. Lighter than `/summary`.

```
GET /api/v1/period/phase

{
  "phase": "OVULATION",
  "phaseSource": "calendar",
  "userType": "REGULAR",
  "pcosStatus": "none",
  "pcosTier": "none",
  "confidence": "high",
  "cycleDay": 14,
  "stats": { ... },
  "contraceptive": { ... },
  "latePathway": { ... }
}
```

### 6.2 GET /period/daily-insight

Returns one personalised insight card for the day. The backend handles content selection, 14-day cooldown, and priority scoring.

```
GET /api/v1/period/daily-insight

{
  "insight": {
    "key": "luteal_pms_general",
    "title": "The week before your period",
    "body": "Falling progesterone affects serotonin...",
    "actionLink": null,
    "isFallback": false
  },
  "context": {
    "phase": "LUTEAL",
    "userType": "REGULAR",
    "pcosTier": "none",
    "confidence": "high",
    "contraceptive": { ... },
    "latePathwayTriggered": false,
    "pcosLikelyFirstSeen": false
  }
}
```

Use the title and body directly on the home screen card. Body is capped at 280 chars, title at 60 chars — they will fit any layout.

Optional query param: `?record=false` returns the insight without recording it in the cooldown history. Useful for previews. Default is `true`.

---

## 7. The one-time PCOS prompt

When the backend's flag evaluator first decides a user's pattern looks like PCOS, the `/daily-insight` response will include:

```
"context": {
  "pcosLikelyFirstSeen": true
}
```

This will be `true` exactly once — on the request where the tier first changes to `likely`. Show a one-time modal or notification with this copy:

> We've noticed some patterns in your cycle and the symptoms you've been logging. These patterns are sometimes associated with PCOS. This is not a diagnosis — only a doctor can confirm — but we wanted to flag it so you can discuss it with a healthcare provider if you'd like.

After this, the user receives PCOS-track insights automatically from `/daily-insight`. You don't need to do anything else.

Important: the app must never use the word "diagnosis" or claim the user has PCOS. The flag is a pattern signal, not a clinical conclusion.

---

## 8. Validation summary

What the backend validates and rejects with a 400. Mirror these in client-side forms:

| Field | Rule |
|---|---|
| `pcosStatus` | One of `confirmed`, `suspected`, `none` |
| `contraceptiveType` | One of the eight values listed in section 3.1 |
| `symptoms[]` | Each item must be in the allowed enum (28 values total — see Swagger) |
| `loggedDate` | ISO date, not in the future |
| `discharge` | One of `dry`, `sticky`, `creamy`, `watery`, `egg_white` |
| `flowLevel` | One of `spotting`, `light`, `medium`, `heavy`, `very_heavy` |
| `painLevel` | Integer 0-10 |
| `lastPeriodDate` | ISO date, required for `/onboarding/cycle-info` |

The full enum lists are in the Swagger UI at `/api-docs`.

---

## 9. Suggested integration order

If you want to ship this in stages:

**Stage 1 (1-2 hours):** Add the contraceptive onboarding screen. Add `protected_sex`, `unprotected_sex`, `started_changed_contraceptive` to the symptom checklist. Both bugs 3 and 4 are now satisfied at the data layer — the backend takes it from there.

**Stage 2 (1 hour):** Read `engine.contraceptive.ovulationSuppressed` in the home screen and hide ovulation/fertile UI when true. This makes Bug 3 fully visible to hormonal users.

**Stage 3 (2-3 hours):** Switch the home screen's daily card from whatever it shows now to the response from `/daily-insight`. This gets you the full PRD insight engine — phase-aware content, PCOS-aware content, late-period pathway, cooldown, all of it.

**Stage 4 (1 hour):** Wire up the `pcosLikelyFirstSeen` one-time modal.

Stages 3 and 4 are the high-value ones. Stages 1 and 2 are the ones that unlock them.

---

## 10. Quick reference — full endpoint list

| Endpoint | Status |
|---|---|
| `POST /onboarding/name` | Unchanged |
| `POST /onboarding/age` | Unchanged |
| `POST /onboarding/hormonal-status` | Now also writes `pcos_status` |
| `POST /onboarding/pcos-status` | NEW |
| `POST /onboarding/contraceptive` | NEW |
| `POST /onboarding/cycle-info` | No longer defaults to 28 days |
| `POST /onboarding/period-regularity` | Auto-classifies non-regular users |
| `POST /onboarding/health-focus` | Unchanged |
| `POST /onboarding/personality` | Unchanged |
| `POST /onboarding/complete` | Unchanged |
| `GET /onboarding/profile` | New fields included |
| `POST /period/first-log` | Unchanged |
| `POST /period/log` | Unchanged |
| `GET /period/logs` | Unchanged |
| `PUT /period/log/:id` | Unchanged |
| `DELETE /period/log/:id` | Unchanged |
| `POST /period/symptoms` | New enum values + contraceptive change pathway |
| `GET /period/symptoms` | Unchanged |
| `GET /period/symptoms/today` | Unchanged |
| `PUT /period/symptoms/:id` | Unchanged |
| `GET /period/prediction` | Suppresses for hormonal users |
| `GET /period/summary` | Adds `engine` block |
| `GET /period/insights` | Unchanged |
| `GET /period/phase` | NEW |
| `GET /period/daily-insight` | NEW |
| `GET /profile` | New fields included |
| `PATCH /profile` | Accepts `contraceptiveType`, `pcosStatus` |
