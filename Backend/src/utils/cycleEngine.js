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


// ─── Contraceptive ─────────────────────────────────────────────────
const HORMONAL_CONTRACEPTIVES = new Set([
  'combined_pill', 'mini_pill', 'hormonal_iud', 'implant',
  'injectable', 'other_hormonal',
]);

export function isHormonalContraceptive(contraceptiveType) {
  return HORMONAL_CONTRACEPTIVES.has(contraceptiveType);
}


// ─── Cycle statistics from period_logs[] ───────────────────────────
// Expects logs sorted ASC by start_date. Returns null fields when there
// isn't enough data (rather than fabricating a 28-day cycle).
export function cycleStats(periodLogs = []) {
  const cycleLengths = [];

  for (let i = 1; i < periodLogs.length; i++) {
    const prev = new Date(periodLogs[i - 1].start_date);
    const curr = new Date(periodLogs[i].start_date);
    const len = Math.round((curr - prev) / 86400000);
    // Sanity: 14-90 days is a defensible biological band; anything outside is
    // almost certainly a typo or a missed log and would distort the stats.
    if (len >= 14 && len <= 90) cycleLengths.push(len);
  }

  if (cycleLengths.length === 0) {
    return {
      cycleLengths: [],
      avgCycleLength: null,
      stdDev:         null,
      minCycle:       null,
      maxCycle:       null,
      cyclesUsed:     0,
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
  };
}


// ─── Average bleed length from logs that have an end_date ──────────
export function avgBleedLength(periodLogs = []) {
  const lengths = [];
  for (const log of periodLogs) {
    if (!log.start_date || !log.end_date) continue;
    const start = new Date(log.start_date);
    const end   = new Date(log.end_date);
    const days  = Math.round((end - start) / 86400000) + 1; // inclusive
    if (days >= 1 && days <= 14) lengths.push(days);
  }
  if (lengths.length === 0) return null;
  const sum = lengths.reduce((a, b) => a + b, 0);
  return Math.round(sum / lengths.length);
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
