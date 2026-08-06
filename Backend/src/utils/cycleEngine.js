/**
 * cycleEngine.js
 *
 * Pure functions implementing the UteriFlow biological model per the
 * Technical PRD. NO calendar assumptions, NO 28-day defaults, NO Day-14
 * ovulation. All math is dynamic and per-user.
 *
 * Modules implemented (PRD §3 — System Architecture):
 *   - mapHormonalToPcos  → vocabulary bridge between legacy and PRD fields
 *   - classifyUserType   → REGULAR | IRREGULAR | PCOS (PRD §2.4)
 *   - cycleStats         → avg_cycle_length, std_dev, min/max from history
 *   - avgBleedLength     → from period_logs that have an end_date
 *   - calculatePhase     → returns phase + window for a given cycle_day (PRD §4.3)
 *   - inferPhaseFromSymptoms → Symptom Intelligence Engine (PRD §4.4)
 *   - evaluatePcosFlags  → 8 flag evaluator (PRD Appendix A)
 *   - confidenceLevel    → high/medium-high/medium/low/none (PRD §4.5)
 *   - isHormonalContraceptive → suppress ovulation/fertile content
 *
 * No external dependencies — kept pure for unit-testing.
 */

// ─── Vocabulary bridges ───────────────────────────────────────────
// The DB column `hormonal_status` predates the PRD and uses
// {diagnosed, suspected, not_sure, no}. The PRD canonical field is
// `pcos_status` ∈ {confirmed, suspected, none}. Both are stored after v5
// migration; this function keeps them in sync.
export function mapHormonalToPcos(hormonalStatus) {
  switch (hormonalStatus) {
    case 'diagnosed': return 'confirmed';
    case 'suspected': return 'suspected';
    case 'not_sure':
    case 'no':        return 'none';
    default:          return null;
  }
}

export function mapPcosToHormonal(pcosStatus) {
  switch (pcosStatus) {
    case 'confirmed': return 'diagnosed';
    case 'suspected': return 'suspected';
    case 'none':      return 'no';
    default:          return null;
  }
}

// Onboarding-range buckets → midpoint integers used internally.
// These mirror the values already in src/routes/onboarding.js to keep
// production behaviour identical, exported here so the engine and the
// route share one source of truth.
export const PERIOD_LENGTH_MIDPOINT = { '1_2': 2, '3_5': 4, '6_8': 7, '9_plus': 9 };
export const CYCLE_LENGTH_MIDPOINT  = { 'lt_21': 18, '21_35': 28, '36_60': 45, 'gt_60': 65 };

// ─── Explicit day-count → classification range ─────────────────────────────
// The onboarding range buckets are wide, so their midpoints ("less than 21" →
// 18) are poor predictions for anyone whose real cycle sits at the edge of a
// bucket — this is exactly why short-cycle (<21) users got inaccurate
// predictions. When the user tells us their ACTUAL cycle/period length as a
// number, we store that number verbatim in cycle_length_avg / period_length_avg
// (the engine already predicts from those columns) and derive the range string
// ONLY for classification (predictability, PCOS routing). The user's real
// number drives the maths; the derived bucket just preserves the existing
// predictability rules.
export function cycleRangeFromDays(days) {
  const n = Number(days);
  if (!Number.isFinite(n)) return null;
  if (n < 21) return 'lt_21';
  if (n <= 35) return '21_35';
  if (n <= 60) return '36_60';
  return 'gt_60';
}

export function periodRangeFromDays(days) {
  const n = Number(days);
  if (!Number.isFinite(n)) return null;
  if (n <= 2) return '1_2';
  if (n <= 5) return '3_5';
  if (n <= 8) return '6_8';
  return '9_plus';
}


// ─── Contraceptive ─────────────────────────────────────────────────
const HORMONAL_CONTRACEPTIVES = new Set([
  'combined_pill', 'mini_pill', 'hormonal_iud', 'implant',
  'injectable', 'other_hormonal',
]);

export function isHormonalContraceptive(contraceptiveType) {
  return HORMONAL_CONTRACEPTIVES.has(contraceptiveType);
}


// ─── Onboarding predictability gate ────────────────────────────────
// Product rule (Figma onboarding screens "How regular is your period?" and
// "How long was your last cycle?"):
//
//   The engine must NOT auto-predict (next period / ovulation / fertile window)
//   for users whose onboarding answers indicate an unpredictable or very long
//   cycle. These users are asked to LOG their cycles themselves after onboarding;
//   prediction resumes only once enough REAL logged cycles exist to compute a
//   measured average. We never fabricate a prediction from the wide onboarding
//   estimate (e.g. the 45-day midpoint of "36–60 days" or the 65-day midpoint
//   of "more than 60 days").
//
// Non-predictive answers:
//   period_regularity ∈ { varies_week, unpredictable }
//   cycle_length_range ∈ { 36_60, gt_60 }
//
// NOTE: 'not_tracked' (regularity) and 'lt_21' (cycle range) are intentionally
// left predictive-eligible — change the sets below if product wants them
// treated as non-predictive too.
export const NON_PREDICTIVE_REGULARITY  = new Set(['varies_week', 'unpredictable']);
export const NON_PREDICTIVE_CYCLE_RANGE = new Set(['36_60', 'gt_60']);

export function onboardingIsPredictive({ periodRegularity, cycleLengthRange } = {}) {
  if (periodRegularity && NON_PREDICTIVE_REGULARITY.has(periodRegularity)) return false;
  if (cycleLengthRange && NON_PREDICTIVE_CYCLE_RANGE.has(cycleLengthRange)) return false;
  return true;
}


// ─── Effective averages (single source of truth for app AND backend) ───────
// The mobile app extrapolates the calendar forward/backward using the cycle &
// period length in the /summary payload, while the backend computes the stored
// prediction from its own value. If those two numbers differ, the app tiles
// periods on different days than the backend predicts → the calendar scatters.
//
// These helpers guarantee ONE effective value, used everywhere:
//
//   • Measured data (from the user's real logged cycles) overrides the
//     onboarding estimate ONLY once there are at least 2 measured cycles
//     (i.e. 3+ logged periods). A single gap — e.g. from back-filling one
//     previous period — can silently span a skipped month and yield a wild
//     length (37, 56 days…), so we keep the onboarding estimate until real
//     evidence accumulates. This is what stops "back-fill a previous month →
//     everything scatters".
//
//   • For non-predictive onboarding profiles (very long / unpredictable) with
//     no measured data yet, the cycle length stays null → no fabricated
//     prediction, exactly as before.
export const MIN_CYCLES_TO_TRUST_MEASURED = 2;

export function computeEffectiveCycleLength(stats, profile, onboardingPredictive) {
  const measuredOk =
    stats && stats.cyclesUsed >= MIN_CYCLES_TO_TRUST_MEASURED && stats.avgCycleLength != null;
  if (measuredOk) return stats.avgCycleLength;
  return onboardingPredictive ? (profile?.cycle_length_avg ?? null) : null;
}

export function computeEffectivePeriodLength(periodLogs, profile) {
  // Measured bleed length once 2+ completed periods (with an end_date) exist;
  // otherwise the onboarding estimate. Never below 1.
  const completed = (periodLogs || []).filter((l) => l?.start_date && l?.end_date);
  if (completed.length >= 2) {
    const measured = avgBleedLength(completed);
    if (measured != null) return measured;
  }
  return profile?.period_length_avg ?? null;
}


// ─── Cycle statistics from period_logs[] ───────────────────────────
// Expects logs sorted ASC by start_date. Returns null fields when there
// isn't enough data (rather than fabricating a 28-day cycle).
// Bug-spec §12 ("Cycle Length Should Not Be Limited By Onboarding Range"):
// a user-recorded cycle must never be rejected or reduced because it falls
// outside an expected range. The band below is a TYPO guard only, not a
// clinical cap — it exists so a mistyped year (e.g. 2025 instead of 2026)
// can't poison the average. It was previously 14-90, which silently DISCARDED
// genuinely long cycles — exactly the PCOS / irregular users the spec cares
// about. Widened to 120 days, and anything excluded is now reported via
// `outliersIgnored` instead of vanishing without trace.
export const CYCLE_MIN_DAYS = 14;
export const CYCLE_MAX_DAYS = 120;

export function cycleStats(periodLogs = []) {
  const cycleLengths = [];
  let outliersIgnored = 0;

  // Collapse duplicate rows before measuring. The old blind-insert behaviour
  // left many users with several rows sharing (or nearly sharing) a start date.
  // Walking those directly produces 0-3 day "cycles" that get discarded, which
  // silently wrecked the cycle average. We keep one entry per distinct cycle by
  // dropping any start date within 10 days of the previous kept one — real
  // cycles are always further apart than that.
  const sorted = [...periodLogs]
    .filter(l => l?.start_date)
    .sort((a, b) => (a.start_date < b.start_date ? -1 : a.start_date > b.start_date ? 1 : 0));
  const deduped = [];
  for (const log of sorted) {
    const prev = deduped[deduped.length - 1];
    if (prev) {
      const gap = Math.round(
        (new Date(log.start_date) - new Date(prev.start_date)) / 86400000
      );
      if (gap < 10) {
        // Same cycle logged more than once — keep the one with an end date
        // (more complete), otherwise keep the later row.
        if (!prev.end_date && log.end_date) deduped[deduped.length - 1] = log;
        continue;
      }
    }
    deduped.push(log);
  }
  periodLogs = deduped;

  for (let i = 1; i < periodLogs.length; i++) {
    const prev = new Date(periodLogs[i - 1].start_date);
    const curr = new Date(periodLogs[i].start_date);
    const len = Math.round((curr - prev) / 86400000);
    if (len >= CYCLE_MIN_DAYS && len <= CYCLE_MAX_DAYS) cycleLengths.push(len);
    else if (Number.isFinite(len) && len > 0)           outliersIgnored += 1;
  }

  if (cycleLengths.length === 0) {
    return {
      cycleLengths: [],
      avgCycleLength: null,
      stdDev:         null,
      minCycle:       null,
      maxCycle:       null,
      cyclesUsed:     0,
      outliersIgnored,
    };
  }

  // PRD §2.3: Average from the last 3-6 cycles (most recent are most
  // representative). Cap at 6 to avoid stale data dominating.
  const recent = cycleLengths.slice(-6);
  const sum = recent.reduce((a, b) => a + b, 0);
  const avg = sum / recent.length;

  const variance = recent.reduce((acc, v) => acc + (v - avg) ** 2, 0) / recent.length;
  const stdDev = Math.sqrt(variance);

  return {
    cycleLengths: recent,
    avgCycleLength: Math.round(avg),
    stdDev:         Math.round(stdDev * 10) / 10, // 1 decimal place
    minCycle:       Math.min(...recent),
    maxCycle:       Math.max(...recent),
    cyclesUsed:     recent.length,
    outliersIgnored,
  };
}


// ─── Period (bleed) duration ───────────────────────────────────────
// Inclusive day count: 1 July → 6 July is 6 days, NOT 5.
// Bug-spec §2: the onboarding estimate is an ESTIMATE. A real logged period
// is never truncated to fit it. The 1-20 band below is a typo guard only.
export const BLEED_MIN_DAYS = 1;
export const BLEED_MAX_DAYS = 20;

export function periodDuration(log) {
  if (!log?.start_date || !log?.end_date) return null;
  const start = new Date(log.start_date);
  const end   = new Date(log.end_date);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const days = Math.round((end - start) / 86400000) + 1; // inclusive
  return days >= 1 ? days : null;
}


// ─── Average bleed length from logs that have an end_date ──────────
// Bug-spec §4: Average Period Length = total logged days / number of logged
// periods — computed from ACTUAL history, never from the onboarding range.
// Previously capped contributing periods at 14 days; widened to 20 so a long
// real period still counts instead of being silently dropped.
export function avgBleedLength(periodLogs = []) {
  // De-duplicate the same way cycleStats does, so a period logged five times
  // doesn't count five times toward the average.
  const sorted = [...periodLogs]
    .filter(l => l?.start_date)
    .sort((a, b) => (a.start_date < b.start_date ? -1 : a.start_date > b.start_date ? 1 : 0));
  const deduped = [];
  for (const log of sorted) {
    const prev = deduped[deduped.length - 1];
    if (prev) {
      const gap = Math.round((new Date(log.start_date) - new Date(prev.start_date)) / 86400000);
      if (gap < 10) {
        if (!prev.end_date && log.end_date) deduped[deduped.length - 1] = log;
        continue;
      }
    }
    deduped.push(log);
  }

  const lengths = [];
  for (const log of deduped) {
    const days = periodDuration(log);
    if (days !== null && days >= BLEED_MIN_DAYS && days <= BLEED_MAX_DAYS) lengths.push(days);
  }
  if (lengths.length === 0) return null;
  const sum = lengths.reduce((a, b) => a + b, 0);
  return Math.round(sum / lengths.length);
}


// ─── Period history (bug-spec §3) ──────────────────────────────────
// Every logged period, individually, with its real duration. This is the
// record set all future calculations are derived from.
// Returns newest-first; `duration` is null while a period is still ongoing
// (no end_date yet) so the client can distinguish "5 days" from "still going".
export function buildPeriodHistory(periodLogs = []) {
  return [...periodLogs]
    .filter(l => l?.start_date)
    .sort((a, b) => (a.start_date < b.start_date ? 1 : -1))
    .map(l => ({
      id:        l.id ?? null,
      startDate: l.start_date,
      endDate:   l.end_date ?? null,
      duration:  periodDuration(l),
      isOngoing: !l.end_date,
    }));
}


// ─── Measured averages, resolved by the spec's priority rules ──────
// Bug-spec §6 — Data Priority Rules:
//   1. user edited / logged period dates
//   2. historical period records
//   3. onboarding estimates       ← lowest priority, never a cap
// Returns both the resolved value AND its source, so clients (and support)
// can always see WHY a number is what it is.
export function resolveAverages(periodLogs = [], profile = {}) {
  const stats         = cycleStats(periodLogs);
  const measuredBleed = avgBleedLength(periodLogs);

  const cycleLength = stats.avgCycleLength ?? profile.cycle_length_avg ?? null;
  const bleedLength = measuredBleed        ?? profile.period_length_avg ?? null;

  // Exact (unrounded) averages. Date arithmetic needs whole days, but the
  // spec's §6 example displays "6.5 days" — so both are provided: the rounded
  // value drives predictions, the exact value is what the UI should show.
  const bleedDays = [];
  for (const log of periodLogs) {
    const d = periodDuration(log);
    if (d !== null && d >= BLEED_MIN_DAYS && d <= BLEED_MAX_DAYS) bleedDays.push(d);
  }
  const round1 = (n) => Math.round(n * 10) / 10;
  const bleedLengthExact = bleedDays.length
    ? round1(bleedDays.reduce((a, b) => a + b, 0) / bleedDays.length)
    : (profile.period_length_avg ?? null);
  const cycleLengthExact = stats.cycleLengths.length
    ? round1(stats.cycleLengths.reduce((a, b) => a + b, 0) / stats.cycleLengths.length)
    : (profile.cycle_length_avg ?? null);

  return {
    bleedLengthExact,
    cycleLengthExact,
    cycleLength,
    cycleLengthSource: stats.avgCycleLength != null ? 'measured'
                     : profile.cycle_length_avg != null ? 'onboarding' : 'unknown',
    bleedLength,
    bleedLengthSource: measuredBleed != null ? 'measured'
                     : profile.period_length_avg != null ? 'onboarding' : 'unknown',
    cyclesUsed:   stats.cyclesUsed,
    periodsLogged: periodLogs.filter(l => l?.end_date).length,
  };
}


// ─── User-type classification (PRD §2.4) ───────────────────────────
// Inputs:
//   stats:           output of cycleStats()
//   pcosStatus:      'confirmed'|'suspected'|'none'|null
//   daysSinceLastPeriod: integer, how long since the most recent logged period
//   cycleRegularity: onboarding answer ('regular'|'varies_week'|'unpredictable'|'not_tracked')
export function classifyUserType({ stats, pcosStatus, daysSinceLastPeriod, cycleRegularity }) {
  // PRD: confirmed PCOS or 60+ days no period → PCOS track
  if (pcosStatus === 'confirmed') return 'PCOS';
  if (typeof daysSinceLastPeriod === 'number' && daysSinceLastPeriod > 60) return 'PCOS';

  // If user told us at onboarding they're irregular, respect that until we
  // have enough cycles to override.
  if (stats.cyclesUsed < 2) {
    if (cycleRegularity && cycleRegularity !== 'regular') return 'IRREGULAR';
    return 'IRREGULAR'; // PRD: "<2 cycles → not enough data → IRREGULAR"
  }

  if (stats.stdDev !== null && stats.stdDev <= 7) return 'REGULAR';
  return 'IRREGULAR';
}


// ─── Phase calculation (PRD §4.3) ──────────────────────────────────
// Returns phase + window descriptor for a given cycle_day.
// userType=REGULAR  → exact phase
// userType=IRREGULAR → phase + range hint
// userType=PCOS     → ALWAYS returns null phase (caller must use symptom inference)
export function calculatePhase({
  userType, cycleDay, avgCycleLength, avgBleedLength: bleed,
  minCycle, maxCycle,
}) {
  if (userType === 'PCOS') {
    return { phase: null, source: 'pcos_no_calendar', confidence: 'none' };
  }

  if (cycleDay == null || avgCycleLength == null) {
    return { phase: null, source: 'insufficient_data', confidence: 'low' };
  }

  // Defensive: bleed length must be at least 1 to leave room for a
  // follicular phase. Default to 5 only if we genuinely have nothing,
  // and clearly mark that as an estimate via lower confidence later.
  const bleedLen = (bleed != null && bleed >= 1 && bleed <= 14) ? bleed : 5;

  // PRD Rule 2: ovulation = cycle_length - 14 (NOT day 14)
  const ovulationDay      = avgCycleLength - 14;
  const fertileWindowStart = Math.max(ovulationDay - 4, bleedLen + 1);
  const fertileWindowEnd   = ovulationDay;

  // LATE pathway: cycle_day exceeds the average cycle length
  if (cycleDay > avgCycleLength) {
    return {
      phase: 'LATE',
      source: 'calendar',
      confidence: userType === 'REGULAR' ? 'high' : 'medium',
      details: {
        daysLate: cycleDay - avgCycleLength,
        avgCycleLength,
      },
    };
  }

  let phase;
  if (cycleDay <= bleedLen)                                phase = 'MENSTRUAL';
  else if (cycleDay < fertileWindowStart)                  phase = 'FOLLICULAR';
  else if (cycleDay <= fertileWindowEnd)                   phase = 'OVULATION';
  else                                                     phase = 'LUTEAL';

  const result = {
    phase,
    source: 'calendar',
    confidence: userType === 'REGULAR' ? 'high' : 'medium',
    details: {
      cycleDay,
      avgCycleLength,
      avgBleedLength: bleedLen,
      ovulationDay,
      fertileWindowStart,
      fertileWindowEnd,
    },
  };

  // For irregular users, also expose the range so the UI can show
  // "Day 14-22" instead of a single date — PRD §4.3 Irregular Users.
  if (userType === 'IRREGULAR' && minCycle != null && maxCycle != null) {
    result.details.ovulationRange = {
      start: minCycle - 14,
      end:   maxCycle - 14,
    };
  }

  return result;
}


// ─── Symptom Intelligence Engine (PRD §4.4) ────────────────────────
// Used for PCOS users (no calendar phases) AND as an override signal for
// regular/irregular users when symptoms strongly disagree with the calendar.
// Returns { inferredPhase, signals } where signals lists which symptom rules fired.
export function inferPhaseFromSymptoms({ symptoms = [], discharge = null, flowLevel = null, mood = [] } = {}) {
  const has = (s) => symptoms.includes(s);
  const moodHas = (m) => mood.includes(m);
  const signals = [];

  // 1. Active bleeding → MENSTRUAL (highest priority)
  if (flowLevel && flowLevel !== 'spotting') {
    signals.push('active_bleeding');
    return { inferredPhase: 'MENSTRUAL', signals, confidence: 'high' };
  }

  // 2. Egg-white / watery mucus + libido or ovulation pain → OVULATION
  if ((discharge === 'egg_white' || discharge === 'watery') && (has('high_libido') || has('pelvic_pain'))) {
    signals.push('ovulatory_mucus_with_libido');
    return { inferredPhase: 'OVULATION', signals, confidence: 'medium' };
  }
  if (discharge === 'egg_white') {
    signals.push('egg_white_mucus');
    return { inferredPhase: 'OVULATION', signals, confidence: 'medium' };
  }

  // 3. Creamy mucus + mild pelvic twinge → APPROACHING_OVULATION
  if (discharge === 'creamy' && has('pelvic_pain')) {
    signals.push('creamy_mucus_with_twinge');
    return { inferredPhase: 'APPROACHING_OVULATION', signals, confidence: 'medium' };
  }

  // 4. Acne + bloating + mood swings (no bleeding) → LUTEAL
  const lutealHits = [has('acne'), has('bloating'), has('mood_swings') || moodHas('irritable')].filter(Boolean).length;
  if (lutealHits >= 2) {
    signals.push('luteal_pattern');
    return { inferredPhase: 'LUTEAL', signals, confidence: 'medium' };
  }

  // 5. Breast tenderness + cravings → late LUTEAL
  if (has('breast_tenderness') && (has('food_cravings') || has('cravings'))) {
    signals.push('late_luteal_pattern');
    return { inferredPhase: 'LUTEAL', signals, confidence: 'medium' };
  }

  // 6. Cramps + fatigue without bleeding → late MENSTRUAL or early FOLLICULAR
  if (has('cramps') && has('fatigue') && !flowLevel) {
    signals.push('cramp_fatigue_no_flow');
    return { inferredPhase: 'LATE_MENSTRUAL_OR_FOLLICULAR', signals, confidence: 'low' };
  }

  // No clear pattern
  return { inferredPhase: null, signals: [], confidence: 'none' };
}


// ─── PCOS Flag Evaluator (PRD Appendix A — Flags A through H) ──────
// allSymptomLogs: array of period_symptoms rows (sorted DESC by logged_date)
// stats:           output of cycleStats()
// periodLogs:      array of period_logs rows (sorted ASC by start_date)
// onContraceptive: boolean — Flag C is suppressed if user is on hormonal BC
export function evaluatePcosFlags({ allSymptomLogs = [], stats, periodLogs = [], onContraceptive = false } = {}) {
  const flags = [];

  // Flag A: avg cycle > 35 days, confirmed across 2+ cycles
  if (stats.avgCycleLength && stats.avgCycleLength > 35 && stats.cyclesUsed >= 2) {
    flags.push('A');
  }

  // Flag B: fewer than 8 periods in rolling 12 months
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const periodsInLastYear = periodLogs.filter(l => new Date(l.start_date) >= oneYearAgo).length;
  if (periodsInLastYear > 0 && periodsInLastYear < 8) {
    flags.push('B');
  }

  // Flag C: no period for 90+ days (suppressed if on hormonal BC)
  if (!onContraceptive && periodLogs.length > 0) {
    const lastPeriod = periodLogs[periodLogs.length - 1];
    const daysSince = Math.floor((Date.now() - new Date(lastPeriod.start_date).getTime()) / 86400000);
    if (daysSince >= 90) flags.push('C');
  }

  // Flag D: cycle length std dev > 10 days across 3+ cycles
  if (stats.stdDev !== null && stats.stdDev > 10 && stats.cyclesUsed >= 3) {
    flags.push('D');
  }

  // Helper: count days a given symptom appears across all logs
  const countSymptomDays = (sym) =>
    allSymptomLogs.filter(l => Array.isArray(l.symptoms) && l.symptoms.includes(sym)).length;

  // Flag E: excess facial/body hair OR scalp hair thinning logged 3+ times
  // Note: these require new symptom enum values — see validators/index.js
  const androgenDays = countSymptomDays('excess_hair') + countSymptomDays('hair_thinning');
  if (androgenDays >= 3) flags.push('E');

  // Flag F: hormonal acne pattern — acne in non-luteal phase across 2+ cycles
  // PRD note: F only contributes to scoring with a cycle flag (A/B/C/D).
  // Implementing the basic detection; combination is enforced in tier scoring.
  const acneDays = countSymptomDays('acne');
  if (acneDays >= 4 && (flags.includes('A') || flags.includes('B') || flags.includes('C') || flags.includes('D'))) {
    flags.push('F');
  }

  // Flag G: insulin resistance signs — weight gain difficulty AND skin darkening
  if (countSymptomDays('weight_gain_difficulty') > 0 && countSymptomDays('skin_darkening') > 0) {
    flags.push('G');
  }

  // Flag H: chronic fatigue — fatigue logged on >60% of tracked days in any 30-day window
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentLogs = allSymptomLogs.filter(l => new Date(l.logged_date) >= thirtyDaysAgo);
  if (recentLogs.length >= 10) {
    const fatigueDays = recentLogs.filter(l => Array.isArray(l.symptoms) && l.symptoms.includes('fatigue')).length;
    if (fatigueDays / recentLogs.length > 0.6) flags.push('H');
  }

  return flags;
}


// ─── PCOS tier from flags (PRD Appendix A → Tier rules) ────────────
export function computePcosTier({ flags, pcosStatus }) {
  if (pcosStatus === 'confirmed') return 'confirmed';

  const cycleFlags   = flags.filter(f => ['A','B','C','D'].includes(f)).length;
  const symptomFlags = flags.filter(f => ['E','F','G','H'].includes(f)).length;

  if (cycleFlags >= 2 && symptomFlags >= 1) return 'likely';
  if (cycleFlags >= 2 || symptomFlags >= 2) return 'possible';
  return 'none';
}


// ─── Confidence level (PRD §4.5) ───────────────────────────────────
export function confidenceLevel({ userType, cyclesLogged, pcosStatus }) {
  if (pcosStatus === 'confirmed' || userType === 'PCOS') return 'none';
  if (userType === 'IRREGULAR') return 'medium';
  if (userType === 'REGULAR' && cyclesLogged >= 3) return 'high';
  if (userType === 'REGULAR' && cyclesLogged >= 1) return 'medium-high';
  return 'low';
}


// ─── Cycle day from last period start ──────────────────────────────
// Returns the 1-indexed cycle day (Day 1 = first day of bleeding).
// Returns null when no period has been logged yet.
export function calculateCycleDay(lastPeriodStart, today = new Date()) {
  if (!lastPeriodStart) return null;
  const start = new Date(lastPeriodStart);
  const t = new Date(today);
  start.setHours(0, 0, 0, 0);
  t.setHours(0, 0, 0, 0);
  const days = Math.floor((t - start) / 86400000);
  if (days < 0) return null;
  return days + 1; // Day 1 = first day of bleeding
}


// ─── Late-period pathway (PRD Bug 4 fix c) ─────────────────────────
// Detects whether the late-period + unprotected-sex pathway should fire.
// Returns:
//   { triggered: true, reason }  → insight should mention pregnancy test
//   { triggered: false, ... }    → standard late-period or no special handling
//
// Inputs:
//   userType:           must be REGULAR or IRREGULAR (PCOS users excluded per PRD)
//   onContraceptive:    if true → never trigger (combined pill suppresses ovulation)
//   cycleDay, avgCycleLength: cycle context
//   recentSymptomLogs:  array of period_symptoms rows from the last ~30 days,
//                       each with { logged_date, symptoms[] }
export function evaluateLatePeriodPathway({
  userType, onContraceptive, cycleDay, avgCycleLength,
  recentSymptomLogs = [], lastPeriodStart,
}) {
  if (userType === 'PCOS') return { triggered: false, reason: 'pcos_excluded' };
  if (onContraceptive)     return { triggered: false, reason: 'on_contraceptive' };
  if (!cycleDay || !avgCycleLength || !lastPeriodStart) {
    return { triggered: false, reason: 'insufficient_data' };
  }

  const daysLate = cycleDay - avgCycleLength;
  if (daysLate < 7) return { triggered: false, reason: 'not_late_enough' };

  // Estimate the fertile window for the cycle in question. PRD §4.3 says
  // ovulation = avg_cycle_length - 14, fertile window starts 4 days before.
  const ovulationDay      = avgCycleLength - 14;
  const fertileWindowStart = Math.max(1, ovulationDay - 4);
  const fertileWindowEnd   = ovulationDay;

  // Convert window to absolute dates for THIS cycle
  const cycleStart = new Date(lastPeriodStart);
  const fwStart = new Date(cycleStart);
  fwStart.setDate(fwStart.getDate() + fertileWindowStart - 1);
  const fwEnd = new Date(cycleStart);
  fwEnd.setDate(fwEnd.getDate() + fertileWindowEnd - 1);

  // Did the user log unprotected sex on any day in [fwStart, fwEnd]?
  const unprotectedInWindow = recentSymptomLogs.some(log => {
    if (!Array.isArray(log.symptoms) || !log.symptoms.includes('unprotected_sex')) return false;
    const logDate = new Date(log.logged_date);
    return logDate >= fwStart && logDate <= fwEnd;
  });

  if (!unprotectedInWindow) return { triggered: false, reason: 'no_unprotected_in_fertile_window', daysLate };

  return {
    triggered: true,
    reason: 'late_with_unprotected_sex_in_fertile_window',
    daysLate,
    fertileWindow: {
      start: fwStart.toISOString().split('T')[0],
      end:   fwEnd.toISOString().split('T')[0],
    },
  };
}
