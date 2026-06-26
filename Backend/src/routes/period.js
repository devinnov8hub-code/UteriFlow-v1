import express from 'express';

import { authenticateUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { periodValidators } from '../validators/index.js';
import { NotFoundError, ConflictError, AppError } from '../errors/index.js';
import { success } from '../utils/response.js';
import { rangeOrEmpty } from '../utils/pagination.js';
import {
  cycleStats, avgBleedLength, classifyUserType, calculatePhase,
  inferPhaseFromSymptoms, evaluatePcosFlags, computePcosTier,
  confidenceLevel, calculateCycleDay, isHormonalContraceptive,
  evaluateLatePeriodPathway, onboardingIsPredictive, mapHormonalToPcos,
} from '../utils/cycleEngine.js';
import { selectDailyInsight } from '../utils/insightEngine.js';

const router = express.Router();
router.use(authenticateUser);

/**
 * Load the full PRD context for a user: profile + period logs + recent
 * symptoms + computed stats + phase + pcos_tier + contraceptive flags.
 * Used by /summary, /daily-insight, /phase. Side-effect: keeps the cached
 * user_type / pcos_tier columns in sync via syncCachedClassification.
 */
async function loadUserContext(db, userId, today = new Date()) {
  const todayIso = today.toISOString().split('T')[0];

  const [profileRes, logsRes, symptomsRes] = await Promise.all([
    db.from('user_profiles')
      .select('display_name, age_group, hormonal_status, pcos_status, period_regularity, ' +
              'cycle_length_avg, period_length_avg, cycle_length_range, period_length_range, ' +
              'last_period_start, contraceptive_type, contraceptive_changed_at, ' +
              'user_type, pcos_tier, personality_type, motivation_style, health_focus')
      .eq('id', userId).maybeSingle(),
    db.from('period_logs').select('*').eq('user_id', userId).order('start_date', { ascending: true }),
    // Last 90 days of symptom logs — enough for late-period pathway,
    // PCOS Flag H (30-day window), and recent insight scoring.
    db.from('period_symptoms').select('*').eq('user_id', userId)
      .gte('logged_date', new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0])
      .order('logged_date', { ascending: false }),
  ]);

  const profile     = profileRes.data || {};
  const periodLogs  = logsRes.data    || [];
  const symptomLogs = symptomsRes.data || [];

  const stats = cycleStats(periodLogs);
  const bleed = avgBleedLength(periodLogs) ?? profile.period_length_avg ?? null;

  // Is this user's onboarding profile predictable? Users who answered
  // "varies by more than a week" / "totally unpredictable" (regularity) or
  // "36–60 days" / "more than 60 days" (last cycle) must NOT be auto-predicted
  // from the onboarding estimate — they log their cycles themselves and the
  // engine only predicts once a MEASURED average exists.
  const onboardingPredictive = onboardingIsPredictive({
    periodRegularity: profile.period_regularity,
    cycleLengthRange: profile.cycle_length_range,
  });

  // Measured average comes only from 2+ real logged cycles (null otherwise).
  const measuredCycleLength = stats.avgCycleLength;

  // Effective cycle length: prefer the measured average (logs). Fall back to the
  // onboarding estimate ONLY for predictable profiles. For non-predictive users
  // with no logged cycles this stays NULL → no fabricated phase/prediction.
  const effectiveCycleLength = measuredCycleLength
    ?? (onboardingPredictive ? (profile.cycle_length_avg ?? null) : null);

  let daysSinceLastPeriod = null;
  let lastPeriodStart = profile.last_period_start;
  if (periodLogs.length > 0) {
    const lastLog = periodLogs[periodLogs.length - 1];
    lastPeriodStart = lastLog.start_date;
    daysSinceLastPeriod = Math.floor((today - new Date(lastLog.start_date)) / 86400000);
  } else if (profile.last_period_start) {
    daysSinceLastPeriod = Math.floor((today - new Date(profile.last_period_start)) / 86400000);
  }

  // Use stored pcos_status; fall back to legacy hormonal_status mapping for
  // users who onboarded before v5 migration.
  const pcosStatus = profile.pcos_status
    ?? (profile.hormonal_status === 'diagnosed' ? 'confirmed'
       : profile.hormonal_status === 'suspected' ? 'suspected'
       : profile.hormonal_status ? 'none' : null);

  const userType = classifyUserType({
    stats: { ...stats, avgCycleLength: effectiveCycleLength },
    pcosStatus,
    daysSinceLastPeriod,
    cycleRegularity: profile.period_regularity,
  });

  const cycleDay = calculateCycleDay(lastPeriodStart, today);

  const onContraceptive = isHormonalContraceptive(profile.contraceptive_type);
  const flags = evaluatePcosFlags({
    allSymptomLogs: symptomLogs,
    stats: { ...stats, avgCycleLength: effectiveCycleLength },
    periodLogs,
    onContraceptive,
  });
  const pcosTier = computePcosTier({ flags, pcosStatus });

  const phaseResult = calculatePhase({
    userType, cycleDay,
    avgCycleLength: effectiveCycleLength,
    avgBleedLength: bleed,
    minCycle: stats.minCycle, maxCycle: stats.maxCycle,
  });

  // Symptom-inferred phase (used for PCOS users and as override when
  // calendar-based phase is unavailable).
  const todayLog = symptomLogs.find(l => l.logged_date === todayIso);
  const inferenceInput = todayLog ?? symptomLogs[0] ?? {};
  const inferred = inferPhaseFromSymptoms({
    symptoms:  inferenceInput.symptoms || [],
    discharge: inferenceInput.discharge || null,
    flowLevel: inferenceInput.flow_level || null,
    mood:      inferenceInput.mood || [],
  });

  let currentPhase = phaseResult.phase;
  let phaseSource  = phaseResult.source;
  if (userType === 'PCOS' || !currentPhase) {
    if (inferred.inferredPhase) {
      currentPhase = inferred.inferredPhase;
      phaseSource  = 'symptom_inference';
    }
  }

  // Late-period pregnancy pathway (Bug 4 fix c)
  const latePathway = evaluateLatePeriodPathway({
    userType, onContraceptive, cycleDay,
    avgCycleLength: effectiveCycleLength,
    recentSymptomLogs: symptomLogs.filter(l => {
      const days = Math.floor((today - new Date(l.logged_date)) / 86400000);
      return days >= 0 && days <= 30;
    }),
    lastPeriodStart,
  });

  const confidence = confidenceLevel({
    userType,
    cyclesLogged: stats.cyclesUsed,
    pcosStatus,
  });

  // ── Prediction availability (single source of truth for the clients) ──
  // The mobile app should hide next-period / ovulation / fertile-window UI and
  // instead prompt the user to log their cycle whenever predictions are not
  // enabled. Reasons are mutually exclusive, evaluated in priority order.
  let predictionsSuppressedReason = null;
  if (userType === 'PCOS')                          predictionsSuppressedReason = 'pcos';
  else if (onContraceptive)                         predictionsSuppressedReason = 'hormonal_contraceptive';
  else if (effectiveCycleLength == null) {
    // No measured average yet. If onboarding was non-predictive, the user must
    // log cycles before we predict; otherwise we simply have no baseline at all.
    predictionsSuppressedReason = onboardingPredictive
      ? 'insufficient_data'
      : 'awaiting_user_logs';
  }
  const predictions = {
    enabled:           predictionsSuppressedReason == null,
    suppressedReason:  predictionsSuppressedReason,            // null when enabled
    onboardingPredictive,
    hasMeasuredCycle:  measuredCycleLength != null,
    cyclesLogged:      stats.cyclesUsed,
  };

  return {
    profile,
    pcosStatus,
    userType,
    contraceptive: {
      type: profile.contraceptive_type ?? null,
      isHormonal: onContraceptive,
      changedAt: profile.contraceptive_changed_at ?? null,
    },
    cycleDay,
    lastPeriodStart,
    daysSinceLastPeriod,
    stats: { ...stats, avgCycleLength: effectiveCycleLength, avgBleedLength: bleed },
    phase: currentPhase,
    phaseDetails: phaseResult.details ?? null,
    phaseSource,
    inferred,
    pcosFlags: flags,
    pcosTier,
    latePathway,
    confidence,
    predictions,
    todaySymptoms: todayLog?.symptoms ?? [],
    recentSymptomLogs: symptomLogs,
  };
}

/**
 * Persist cached user_type and pcos_tier back onto user_profiles.
 * Best-effort — failures are logged but never raised.
 */
async function syncCachedClassification(db, userId, ctx) {
  try {
    const updates = {};
    if (ctx.userType && ctx.userType !== ctx.profile.user_type) {
      updates.user_type = ctx.userType;
    }
    if (ctx.pcosTier && ctx.pcosTier !== ctx.profile.pcos_tier) {
      updates.pcos_tier = ctx.pcosTier;
    }
    if (Object.keys(updates).length > 0) {
      await db.from('user_profiles').update(updates).eq('id', userId);
    }
  } catch (e) {
    console.warn('[syncCachedClassification] failed:', e.message);
  }
}
// PRD Rule 1: never assume a 28-day cycle. Required args, no defaults.
// Callers (refreshPredictions) must supply real values from logs or onboarding.
// Throws if cycleLengthAvg is missing — the bug here is upstream, fail loud.
function computePredictions(lastStart, cycleLengthAvg, periodLengthAvg) {
  if (!lastStart || !cycleLengthAvg) {
    throw new Error('computePredictions requires lastStart and cycleLengthAvg');
  }
  const safePeriodLength = periodLengthAvg ?? 5; // affects predicted_end only, not ovulation math
  const start = new Date(lastStart);
  const predictedStart = new Date(start);
  predictedStart.setDate(start.getDate() + cycleLengthAvg);

  const predictedEnd = new Date(predictedStart);
  predictedEnd.setDate(predictedStart.getDate() + safePeriodLength - 1);

  // PRD Rule 2: ovulation = avg_cycle_length - 14 (NOT day 14)
  const ovulation = new Date(predictedStart);
  ovulation.setDate(predictedStart.getDate() - 14);

  const fertileStart = new Date(ovulation);
  fertileStart.setDate(ovulation.getDate() - 5);
  const fertileEnd = new Date(ovulation);
  fertileEnd.setDate(ovulation.getDate() + 1);

  return {
    predicted_start:      predictedStart.toISOString().split('T')[0],
    predicted_end:        predictedEnd.toISOString().split('T')[0],
    ovulation_date:       ovulation.toISOString().split('T')[0],
    fertile_window_start: fertileStart.toISOString().split('T')[0],
    fertile_window_end:   fertileEnd.toISOString().split('T')[0],
  };
}

async function refreshPredictions(db, userId) {
  // Helper: clear any cached "current" prediction. Called whenever we decide
  // NOT to generate a prediction so a stale/bogus one (e.g. from before the
  // user was reclassified as PCOS / irregular) doesn't linger.
  const clearCurrent = () =>
    db.from('cycle_predictions')
      .update({ is_current: false })
      .eq('user_id', userId)
      .eq('is_current', true);

  // Pull everything we need to decide IF we should predict at all.
  const { data: profile } = await db
    .from('user_profiles')
    .select('cycle_length_avg, period_length_avg, contraceptive_type, ' +
            'period_regularity, cycle_length_range, last_period_start, ' +
            'pcos_status, hormonal_status')
    .eq('id', userId)
    .maybeSingle();

  // PRD Bug 3 fix (b): no ovulation/fertile predictions for hormonal users.
  if (isHormonalContraceptive(profile?.contraceptive_type)) {
    await clearCurrent();
    return null;
  }

  // Prefer the measured average from logs over the onboarding estimate.
  // This is the PRD's "Cycle Length Formula" — average of last 3-6 cycles.
  const { data: allLogs } = await db
    .from('period_logs')
    .select('start_date')
    .eq('user_id', userId)
    .order('start_date', { ascending: true });

  const measuredStats = cycleStats(allLogs || []);

  // Determine the user track. PCOS users (confirmed, or 60+ days since last
  // period) get NO calendar prediction — the engine routes them to symptom
  // inference instead. This is the core fix for "the PCOS / 60+ day users were
  // still receiving a normal calendar prediction after onboarding".
  const lastStart = allLogs?.length
    ? allLogs[allLogs.length - 1].start_date
    : (profile?.last_period_start ?? null);
  const daysSinceLastPeriod = lastStart
    ? Math.floor((Date.now() - new Date(lastStart).getTime()) / 86400000)
    : null;
  const pcosStatus = profile?.pcos_status ?? mapHormonalToPcos(profile?.hormonal_status);

  const userType = classifyUserType({
    stats: measuredStats,
    pcosStatus,
    daysSinceLastPeriod,
    cycleRegularity: profile?.period_regularity,
  });

  if (userType === 'PCOS') {
    await clearCurrent();
    return null;
  }

  // Product rule: users whose onboarding answers are non-predictive
  // (regularity "varies/unpredictable" OR last cycle "36–60"/"60+") must NOT be
  // predicted from the onboarding estimate. They log their own cycles; we only
  // predict once a MEASURED average exists.
  const onboardingPredictive = onboardingIsPredictive({
    periodRegularity: profile?.period_regularity,
    cycleLengthRange: profile?.cycle_length_range,
  });

  const cycleLengthAvg = measuredStats.avgCycleLength
    ?? (onboardingPredictive ? (profile?.cycle_length_avg ?? null) : null);
  const periodLengthAvg = profile?.period_length_avg ?? null;

  // PRD Rule 1: never assume 28 days. With no measured average and no usable
  // onboarding baseline, do NOT generate a prediction.
  if (!cycleLengthAvg) {
    await clearCurrent();
    return null;
  }

  // periodLengthAvg can stay null — computePredictions accepts it and falls
  // back to the legacy default (which only affects predicted_end, not the
  // ovulation/fertile math).
  const safePeriodLength = periodLengthAvg ?? 5;

  const { data: lastLog } = await db
    .from('period_logs')
    .select('start_date')
    .eq('user_id', userId)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastLog) {
    await clearCurrent();
    return null;
  }

  const pred = computePredictions(lastLog.start_date, cycleLengthAvg, safePeriodLength);

  await clearCurrent();

  const { data } = await db
    .from('cycle_predictions')
    .insert({ user_id: userId, ...pred, is_current: true })
    .select()
    .single();

  return data;
}


router.post('/first-log', periodValidators.logCreate, validate, async (req, res, next) => {
  try {
    const { startDate, notes } = req.body;
    const userId = req.user.id;

    const { data: existingLog, error: checkError } = await req.supabase
      .from('period_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('is_first_log', true)
      .maybeSingle();
    if (checkError) throw checkError;
    if (existingLog) throw new ConflictError('First period has already been logged');

    const { data, error } = await req.supabase
      .from('period_logs')
      .insert({ user_id: userId, start_date: startDate, notes: notes ?? null, is_first_log: true })
      .select()
      .single();
    if (error) throw error;

    
    await refreshPredictions(req.supabase, userId).catch(() => {});

    return success(res, { message: 'First period logged successfully', periodLog: data }, 201);
  } catch (error) { next(error); }
});


router.post('/log', periodValidators.logCreate, validate, async (req, res, next) => {
  try {
    const { startDate, endDate, notes } = req.body;
    const userId = req.user.id;

    const { data, error } = await req.supabase
      .from('period_logs')
      .insert({
        user_id: userId,
        start_date: startDate,
        end_date: endDate ?? null,
        notes: notes ?? null,
        is_first_log: false,
      })
      .select()
      .single();
    if (error) throw error;

    
    await refreshPredictions(req.supabase, userId).catch(() => {});

    return success(res, { message: 'Period logged successfully', periodLog: data }, 201);
  } catch (error) { next(error); }
});


router.get('/logs', periodValidators.pagination, validate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit  = req.query.limit  ?? 10;
    const offset = req.query.offset ?? 0;

    const logsQuery = req.supabase
      .from('period_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('start_date', { ascending: false })
      .range(offset, offset + limit - 1);

    const { rows: data, total: count } = await rangeOrEmpty(logsQuery, () =>
      req.supabase.from('period_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId)
    );

    return success(res, { periodLogs: data, total: count, limit, offset });
  } catch (error) { next(error); }
});


router.put('/log/:id', periodValidators.logUpdate, validate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, notes } = req.body;
    const userId = req.user.id;

    const updateData = {};
    if (startDate !== undefined) updateData.start_date = startDate;
    if (endDate   !== undefined) updateData.end_date   = endDate;
    if (notes     !== undefined) updateData.notes      = notes;

    if (Object.keys(updateData).length === 0)
      return success(res, { message: 'No changes provided' });

    const { data, error } = await req.supabase
      .from('period_logs')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data)  throw new NotFoundError('Period log not found');

    await refreshPredictions(req.supabase, userId).catch(() => {});

    return success(res, { message: 'Period log updated successfully', periodLog: data });
  } catch (error) { next(error); }
});


router.delete('/log/:id', periodValidators.logDelete, validate, async (req, res, next) => {
  try {
    const { id }    = req.params;
    const userId    = req.user.id;

    const { data, error } = await req.supabase
      .from('period_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data)  throw new NotFoundError('Period log not found');

    await refreshPredictions(req.supabase, userId).catch(() => {});

    return success(res, { message: 'Period log deleted successfully' });
  } catch (error) { next(error); }
});

// POST /period/symptoms
// Creates a new symptom log entry for a given date.
// If the user already has an entry for that date, it UPDATES it instead of
// creating a duplicate (upsert behaviour — avoids "no symptom ID" confusion).
//
// PRD Bug 3 fix (c) — Contraceptive change pathway:
//   When the symptoms array contains 'started_changed_contraceptive' AND
//   the request also includes a `contraceptiveType` field, we update the
//   user's profile in the SAME request and re-run the contraceptive routing.
//   This mirrors how Flo handles contraceptive tracking: the change is logged
//   as part of the daily symptom checklist with a one-tap follow-up, not a
//   separate clinical settings screen.
//
// PRD Bug 4 fix — Sexual activity:
//   'protected_sex' and 'unprotected_sex' are now part of ALLOWED_SYMPTOMS.
//   They flow through this same endpoint with no special handling here —
//   the late-period pathway in /daily-insight reads them retrospectively.
router.post('/symptoms', periodValidators.symptomLog, validate, async (req, res, next) => {
  try {
    const { loggedDate, logId, symptoms, flowLevel, discharge, mood, painLevel, notes, contraceptiveType } = req.body;
    const userId     = req.user.id;
    const targetDate = loggedDate ?? new Date().toISOString().split('T')[0];

    // Check whether an entry already exists for this user+date
    const { data: existing } = await req.supabase
      .from('period_symptoms')
      .select('id')
      .eq('user_id', userId)
      .eq('logged_date', targetDate)
      .maybeSingle();

    let data, error;

    if (existing) {
      // UPDATE the existing entry — this is what allows the frontend to
      // call POST /symptoms on the same day without creating duplicates
      ({ data, error } = await req.supabase
        .from('period_symptoms')
        .update({
          log_id:     logId     ?? null,
          symptoms:   symptoms  ?? [],
          flow_level: flowLevel ?? null,
          discharge:  discharge ?? null,
          mood:       mood      ?? [],
          pain_level: painLevel ?? null,
          notes:      notes     ?? null,
        })
        .eq('id', existing.id)
        .select()
        .single());
    } else {
      ({ data, error } = await req.supabase
        .from('period_symptoms')
        .insert({
          user_id:     userId,
          log_id:      logId     ?? null,
          logged_date: targetDate,
          symptoms:    symptoms  ?? [],
          flow_level:  flowLevel ?? null,
          discharge:   discharge ?? null,
          mood:        mood      ?? [],
          pain_level:  painLevel ?? null,
          notes:       notes     ?? null,
        })
        .select()
        .single());
    }

    if (error) throw error;

    // PRD Bug 3 fix (c): contraceptive change side-effect
    // If the user logged the contraceptive-change item AND told us the new method,
    // update the profile so the engine re-routes immediately. We don't enforce
    // that contraceptiveType be present (the user may want to log just the change
    // event without committing to a method right now).
    let contraceptiveUpdated = false;
    if (Array.isArray(symptoms) && symptoms.includes('started_changed_contraceptive') && contraceptiveType) {
      const { error: profileErr } = await req.supabase
        .from('user_profiles')
        .update({
          contraceptive_type:       contraceptiveType,
          contraceptive_changed_at: new Date().toISOString(),
        })
        .eq('id', userId);
      if (!profileErr) {
        contraceptiveUpdated = true;
      } else {
        console.warn('[symptoms] contraceptive update failed:', profileErr.message);
      }
    }

    return success(res, {
      message: 'Symptoms logged successfully',
      symptomLog: data,
      ...(contraceptiveUpdated ? { contraceptiveUpdated: true, contraceptiveType } : {}),
      // Hint for the frontend so it knows to prompt the user for the new method
      // when the change item was logged WITHOUT a contraceptiveType in this request.
      ...(Array.isArray(symptoms) && symptoms.includes('started_changed_contraceptive') && !contraceptiveType
        ? { promptContraceptiveType: true }
        : {}),
    }, existing ? 200 : 201);
  } catch (error) { next(error); }
});


// GET /period/symptoms — paginated list of all symptom entries for the logged-in user
// The `id` field is included so the frontend can reference specific entries.
router.get('/symptoms', periodValidators.pagination, validate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit  = req.query.limit  ?? 30;
    const offset = req.query.offset ?? 0;

    const symptomsQuery = req.supabase
      .from('period_symptoms')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('logged_date', { ascending: false })
      .range(offset, offset + limit - 1);

    const { rows: data, total: count } = await rangeOrEmpty(symptomsQuery, () =>
      req.supabase.from('period_symptoms').select('id', { count: 'exact', head: true }).eq('user_id', userId)
    );

    return success(res, { symptoms: data, total: count, limit, offset });
  } catch (error) { next(error); }
});


// GET /period/symptoms/today — convenience endpoint to get today's symptom entry
// Returns null in `symptomLog` if none logged yet (never returns 404)
router.get('/symptoms/today', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today  = new Date().toISOString().split('T')[0];

    const { data, error } = await req.supabase
      .from('period_symptoms')
      .select('*')
      .eq('user_id', userId)
      .eq('logged_date', today)
      .maybeSingle();
    if (error) throw error;

    return success(res, { symptomLog: data ?? null, date: today });
  } catch (error) { next(error); }
});


// GET /period/symptoms/:date — fetch the symptom entry for a specific date.
//
// Mirrors GET /period/symptoms/today but for any past date the user wants to
// look up (e.g. when the frontend navigates to a previous day on the Cycle Day
// calendar and needs to pre-fill the checklist with what was already logged).
//
// `:date` must be an ISO 8601 date string (YYYY-MM-DD). Future dates are rejected.
// Returns null in `symptomLog` if no entry exists for that date — never returns 404.
router.get('/symptoms/:date', periodValidators.byDate, validate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { date } = req.params;

    const { data, error } = await req.supabase
      .from('period_symptoms')
      .select('*')
      .eq('user_id', userId)
      .eq('logged_date', date)
      .maybeSingle();
    if (error) throw error;

    return success(res, { symptomLog: data ?? null, date });
  } catch (error) { next(error); }
});


// GET /period/prediction
//
// Returns the user's current cycle prediction (next period, ovulation, fertile
// window). Triggers a recompute if no current prediction is cached.
//
// PRD Bug 3 fix (b): for users on hormonal contraception, returns
// `prediction: null` plus a `suppressedReason` flag so the frontend can render
// the contraceptive-aware UI instead of a fertility window. Their natural
// cycle is chemically suppressed and predicting ovulation would be incorrect
// and potentially misleading.
router.get('/prediction', async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Check contraceptive status first — the engine should never compute or
    // return predictions for hormonal contraceptive users.
    const { data: profile } = await req.supabase
      .from('user_profiles')
      .select('contraceptive_type')
      .eq('id', userId)
      .maybeSingle();

    if (isHormonalContraceptive(profile?.contraceptive_type)) {
      return success(res, {
        prediction: null,
        suppressed: true,
        suppressedReason: 'hormonal_contraceptive',
        message: 'Ovulation and fertile window predictions are not shown for users on hormonal contraception.',
      });
    }

    const { data: prediction, error } = await req.supabase
      .from('cycle_predictions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_current', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;

    if (!prediction) {
      const computed = await refreshPredictions(req.supabase, userId);
      return success(res, { prediction: computed ?? null });
    }

    return success(res, { prediction });
  } catch (error) { next(error); }
});


// GET /period/summary
//
// Home-screen dashboard payload. Preserves all existing fields for backward
// compatibility with production clients, AND adds new PRD-engine fields under
// `engine` so newer clients can use the richer phase / pcos_tier / contraceptive
// state without breaking older app builds.
//
// PRD Bug 3 fix (b): hormonal contraceptive users get `prediction: null` and
// `cyclePhase: 'contraceptive_suppressed'`. Their natural cycle is chemically
// suppressed, so showing predicted ovulation or fertile window is incorrect.
router.get('/summary', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today  = new Date().toISOString().split('T')[0];
    const todayDate = new Date();

    const ctx = await loadUserContext(req.supabase, userId, todayDate);
    // Side effect: refresh cached user_type/pcos_tier on the profile row.
    await syncCachedClassification(req.supabase, userId, ctx);

    const profile = ctx.profile;

    // Existing fields kept for backward compatibility ─────────────
    let prediction = null;
    if (!ctx.contraceptive.isHormonal) {
      const { data: pred } = await req.supabase
        .from('cycle_predictions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_current', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      prediction = pred ?? null;
    }

    const { data: lastLog } = await req.supabase
      .from('period_logs')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: todaySymptoms } = await req.supabase
      .from('period_symptoms')
      .select('*')
      .eq('user_id', userId)
      .eq('logged_date', today)
      .maybeSingle();

    // Map the PRD phase enum back to the legacy short strings the existing
    // frontend expects ('menstrual'|'fertile'|'pms'|'follicular'|'unknown').
    // For new clients, the canonical PRD phase is exposed under engine.phase.
    let cyclePhase = 'unknown';
    let daysUntilPeriod = null;

    if (ctx.contraceptive.isHormonal) {
      cyclePhase = 'contraceptive_suppressed';
    } else if (ctx.phase) {
      switch (ctx.phase) {
        case 'MENSTRUAL':              cyclePhase = 'menstrual';   break;
        case 'OVULATION':
        case 'APPROACHING_OVULATION':  cyclePhase = 'fertile';     break;
        case 'LUTEAL':                 cyclePhase = 'pms';         break;
        case 'FOLLICULAR':             cyclePhase = 'follicular';  break;
        case 'LATE':                   cyclePhase = 'late';        break;
        case 'LATE_MENSTRUAL_OR_FOLLICULAR': cyclePhase = 'follicular'; break;
        default:                       cyclePhase = 'unknown';
      }
    }

    if (prediction && !ctx.contraceptive.isHormonal) {
      const predStart  = new Date(prediction.predicted_start);
      daysUntilPeriod  = Math.round((predStart - todayDate) / 86400000);
    }

    const tips = {
      cycle_sharer:      'Share how you\'re feeling in the community today 💜',
      health_optimizer:  'Track today\'s symptoms for better cycle insights 📊',
      silent_tracker:    'Your data is private and secure. Keep tracking 🔒',
      community_seeker:  'Someone in the community might need your support today ✨',
    };
    const personalizedTip = tips[profile?.personality_type] ?? 'Take care of yourself today 💜';

    return success(res, {
      summary: {
        // ── Existing fields (production contract — DO NOT REMOVE) ──
        // Keep snake_case `display_name` here (NOT camelCase `userName`) — the
        // rest of the API exposes profile fields with the same name as the
        // underlying DB column, and the frontend reads `display_name`.
        display_name:     profile?.display_name,
        cyclePhase,
        daysUntilPeriod,
        prediction,
        lastPeriod:       lastLog,
        todaySymptoms,
        personalizedTip,
        profile: {
          personalityType:  profile?.personality_type,
          motivationStyle:  profile?.motivation_style,
          healthFocus:      profile?.health_focus,
          hormonalStatus:   profile?.hormonal_status,
          // NOTE: these two are nullable per PRD; we no longer fabricate 28/5
          // when the user hasn't told us. Old clients should stop relying on
          // these defaults and read from `engine` instead.
          cycleLengthAvg:   profile?.cycle_length_avg ?? null,
          periodLengthAvg:  profile?.period_length_avg ?? null,
        },

        // ── New PRD engine fields (additive for new clients) ─────
        engine: {
          phase:            ctx.phase,           // canonical PRD phase enum
          phaseSource:      ctx.phaseSource,     // 'calendar'|'symptom_inference'|'pcos_no_calendar'|'insufficient_data'
          phaseDetails:     ctx.phaseDetails,    // ovulation_day, fertile_window_start/end, etc.
          userType:         ctx.userType,        // REGULAR|IRREGULAR|PCOS
          pcosStatus:       ctx.pcosStatus,      // confirmed|suspected|none
          pcosTier:         ctx.pcosTier,        // none|possible|likely|confirmed
          pcosFlags:        ctx.pcosFlags,       // ['A','E','H',...]
          confidence:       ctx.confidence,      // high|medium-high|medium|low|none
          cycleDay:         ctx.cycleDay,
          daysSinceLastPeriod: ctx.daysSinceLastPeriod,
          stats: {
            avgCycleLength: ctx.stats.avgCycleLength,
            avgBleedLength: ctx.stats.avgBleedLength,
            stdDev:         ctx.stats.stdDev,
            cyclesUsed:     ctx.stats.cyclesUsed,
            minCycle:       ctx.stats.minCycle,
            maxCycle:       ctx.stats.maxCycle,
          },
          contraceptive: {
            type:       ctx.contraceptive.type,
            isHormonal: ctx.contraceptive.isHormonal,
            // True when the engine has suppressed ovulation/fertile content
            ovulationSuppressed: ctx.contraceptive.isHormonal,
          },
          latePeriodPathway: ctx.latePathway,    // { triggered, reason, daysLate?, fertileWindow? }

          // Whether the engine is auto-predicting for this user. When
          // enabled=false the app should HIDE next-period / ovulation / fertile
          // UI and prompt the user to log their cycle instead.
          //   suppressedReason: 'pcos' | 'hormonal_contraceptive'
          //                   | 'awaiting_user_logs'   (non-predictive onboarding answer)
          //                   | 'insufficient_data'    (predictive answer but no baseline yet)
          //                   | null                   (predictions enabled)
          predictions:       ctx.predictions,
        },
      },
    });
  } catch (error) { next(error); }
});

router.get('/insights', async (req, res, next) => {
  try {
    const userId = req.user.id;

    
    const { data: logs, error: logsError } = await req.supabase
      .from('period_logs')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: true });
    if (logsError) throw logsError;

    // Fetch profile early — used both for empty-state defaults and the tip
    const { data: profile } = await req.supabase
      .from('user_profiles')
      .select('personality_type, cycle_length_avg, period_length_avg')
      .eq('id', userId)
      .maybeSingle();

    const profileCycleAvg  = profile?.cycle_length_avg  ?? null;
    const profilePeriodAvg = profile?.period_length_avg ?? 5;

    if (!logs || logs.length === 0) {
      return success(res, {
        insights: {
          cyclesTracked: 0,
          longestCycle: null,
          shortestCycle: null,
          averageCycleLength: profileCycleAvg, // use onboarding estimate if set
          cycleRange: null,
          cycleHistory: [],
          recentLogs: [],
          prediction: null,
          frequentSymptoms: [],
          tip: 'Log your first period to start seeing cycle insights.',
        },
      });
    }

    
    const cycleHistory = [];
    let longestCycle = 0;
    let shortestCycle = Infinity;
    let totalLength = 0;

    for (let i = 1; i < logs.length; i++) {
      const prev = new Date(logs[i - 1].start_date);
      const curr = new Date(logs[i].start_date);
      const length = Math.round((curr - prev) / 86400000);
      if (length > 0 && length < 120) { // sanity check
        cycleHistory.push({ label: `Cycle ${i}`, days: length, startDate: logs[i-1].start_date });
        if (length > longestCycle)  longestCycle  = length;
        if (length < shortestCycle) shortestCycle = length;
        totalLength += length;
      }
    }

    const cyclesTracked = cycleHistory.length;

    // If we have at least one completed cycle, use the measured average.
    // Otherwise fall back to the user's onboarding cycle_length_avg so the UI
    // always has a number to display instead of null.
    const averageCycleLength = cyclesTracked > 0
      ? Math.round(totalLength / cyclesTracked)
      : profileCycleAvg;

    // When the user only has 1 log, compute the in-progress cycle (last log → today)
    // so the chart and history aren't empty. Mark it as `inProgress: true` so the UI
    // can style it differently (e.g. dashed bar) if desired.
    if (logs.length >= 1 && cyclesTracked === 0) {
      const lastLog = logs[logs.length - 1];
      const lastStart = new Date(lastLog.start_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysSoFar = Math.round((today - lastStart) / 86400000);
      if (daysSoFar > 0 && daysSoFar < 120) {
        cycleHistory.push({
          label: 'Current',
          days: daysSoFar,
          startDate: lastLog.start_date,
          inProgress: true,
        });
      }
    }

   
    const { data: allSymptoms } = await req.supabase
      .from('period_symptoms')
      .select('symptoms, discharge, flow_level')
      .eq('user_id', userId);

    const symptomFreq = {};
    for (const s of (allSymptoms ?? [])) {
      for (const sym of (s.symptoms ?? [])) {
        symptomFreq[sym] = (symptomFreq[sym] || 0) + 1;
      }
    }
    const frequentSymptoms = Object.entries(symptomFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const recentLogs = logs.filter(l => new Date(l.start_date) >= threeMonthsAgo);
  
    const { data: prediction } = await req.supabase
      .from('cycle_predictions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_current', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // cycleRange shows the measured min–max only when we have >1 completed cycles.
    // For 1 completed cycle, just show the single value. For 0 cycles but a known
    // onboarding average, show that so the UI card isn't blank.
    let cycleRange = null;
    if (cyclesTracked > 1) {
      cycleRange = `${shortestCycle}–${longestCycle} days`;
    } else if (cyclesTracked === 1) {
      cycleRange = `${longestCycle} days`;
    } else if (profileCycleAvg) {
      cycleRange = `~${profileCycleAvg} days`;
    }

    return success(res, {
      insights: {
        cyclesTracked,
        longestCycle:        longestCycle   || null,
        shortestCycle:       shortestCycle === Infinity ? null : shortestCycle,
        averageCycleLength,
        cycleRange,
        cycleHistory,         // for bar chart
        recentLogs,           // for calendar view
        prediction,           // current cycle prediction overlay
        frequentSymptoms,
      },
    });
  } catch (error) { next(error); }
});

// PUT /period/symptoms/:id — update a specific symptom log entry by its ID
router.put('/symptoms/:id', async (req, res, next) => {
  try {
    const { id }     = req.params;
    const userId     = req.user.id;
    const { symptoms, flowLevel, discharge, mood, painLevel, notes, loggedDate } = req.body;

    const updates = {};
    if (symptoms    !== undefined) updates.symptoms    = symptoms;
    if (flowLevel   !== undefined) updates.flow_level  = flowLevel;
    if (discharge   !== undefined) updates.discharge   = discharge;
    if (mood        !== undefined) updates.mood        = mood;
    if (painLevel   !== undefined) updates.pain_level  = painLevel;
    if (notes       !== undefined) updates.notes       = notes;
    if (loggedDate  !== undefined) updates.logged_date = loggedDate;

    if (Object.keys(updates).length === 0) {
      return success(res, { message: 'No changes provided' });
    }

    const { data, error } = await req.supabase
      .from('period_symptoms')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('Symptom log not found');

    return success(res, { message: 'Symptoms updated successfully', symptomLog: data });
  } catch (error) { next(error); }
});


// ═══════════════════════════════════════════════════════════════════
// PRD Phase Engine + Daily Insight Engine endpoints
// ═══════════════════════════════════════════════════════════════════

// GET /period/phase
//
// Returns the user's current cycle phase per the PRD Phase Engine. Combines
// calendar-based calculation (REGULAR/IRREGULAR users) and symptom-based
// inference (PCOS users, or when calendar data is insufficient).
//
// Response includes:
//   - phase:        canonical PRD enum (MENSTRUAL|FOLLICULAR|OVULATION|LUTEAL|LATE|null)
//   - phaseSource:  'calendar' | 'symptom_inference' | 'pcos_no_calendar' | 'insufficient_data'
//   - userType:     REGULAR | IRREGULAR | PCOS
//   - confidence:   high | medium-high | medium | low | none
//   - cycleDay:     1-indexed day in the current cycle (null if no period logged yet)
//   - stats:        avg_cycle_length, avg_bleed_length, std_dev, min/max, cycles used
//   - phaseDetails: ovulation_day, fertile_window_start/end (when known)
//   - inferred:     symptom-inferred phase + signals
//   - latePathway:  late-period + unprotected sex pathway state
//   - contraceptive: { type, isHormonal, ovulationSuppressed }
//
// PRD Bug 3 fix (b): when isHormonal=true, calendar phases are NOT shown — the
// engine returns null phase (or symptom-inferred phase) and the client should
// render contraceptive-aware UI instead.
router.get('/phase', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const ctx = await loadUserContext(req.supabase, userId, new Date());
    await syncCachedClassification(req.supabase, userId, ctx);

    return success(res, {
      phase:        ctx.phase,
      phaseSource:  ctx.phaseSource,
      phaseDetails: ctx.phaseDetails,
      userType:     ctx.userType,
      pcosStatus:   ctx.pcosStatus,
      pcosTier:     ctx.pcosTier,
      pcosFlags:    ctx.pcosFlags,
      confidence:   ctx.confidence,
      cycleDay:     ctx.cycleDay,
      lastPeriodStart:     ctx.lastPeriodStart,
      daysSinceLastPeriod: ctx.daysSinceLastPeriod,
      stats: {
        avgCycleLength: ctx.stats.avgCycleLength,
        avgBleedLength: ctx.stats.avgBleedLength,
        stdDev:         ctx.stats.stdDev,
        cyclesUsed:     ctx.stats.cyclesUsed,
        minCycle:       ctx.stats.minCycle,
        maxCycle:       ctx.stats.maxCycle,
      },
      inferred:      ctx.inferred,
      latePathway:   ctx.latePathway,
      contraceptive: ctx.contraceptive,
      predictions:   ctx.predictions,
    });
  } catch (error) { next(error); }
});


// GET /period/daily-insight
//
// The Daily Insight Engine endpoint (PRD §5). Runs the full selection pipeline:
//   1. Load user context (profile + logs + symptoms)
//   2. Calculate phase
//   3. Evaluate PCOS flags + tier
//   4. Filter content library by phase + userType + pcosTier + contraceptive
//   5. Apply 14-day cooldown
//   6. Score by priority + symptom matches + recency penalty
//   7. Return the highest-scoring card (or fallback)
//
// Side effects:
//   - Records the displayed insight in `daily_insight_history` for cooldown tracking
//   - Updates cached `user_type` and `pcos_tier` on user_profiles
//
// Query params:
//   - record (boolean, default true): set to false to peek at the insight without
//     adding it to the cooldown history (useful for client-side previews/testing)
router.get('/daily-insight', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const recordHistory = req.query.record !== 'false';
    const today = new Date();
    const todayIso = today.toISOString().split('T')[0];

    const ctx = await loadUserContext(req.supabase, userId, today);
    await syncCachedClassification(req.supabase, userId, ctx);

    // Pull recent insight history for the cooldown filter (last 14 days is enough,
    // but we fetch 21 to give the recency-penalty calculator some headroom).
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - 21);
    const { data: history } = await req.supabase
      .from('daily_insight_history')
      .select('insight_key, shown_date')
      .eq('user_id', userId)
      .gte('shown_date', cutoff.toISOString().split('T')[0]);

    // Pathway flags drive priority — late-period + unprotected sex flips the
    // late_with_unprotected_sex insight into the top slot.
    const pathwayFlags = [];
    if (ctx.latePathway?.triggered) {
      pathwayFlags.push('late_period_pregnancy_pathway');
    }

    const insight = selectDailyInsight({
      userType:      ctx.userType,
      currentPhase:  ctx.phase,
      pcosTier:      ctx.pcosTier,
      contraceptive: ctx.contraceptive,
      todaySymptoms: ctx.todaySymptoms,
      recentlyShown: history ?? [],
      pathwayFlags,
    });

    // Record the display so future requests respect the cooldown. We use upsert
    // semantics by checking for an existing row for THIS card on TODAY first —
    // multiple loads of the same day shouldn't pile up duplicate history rows.
    if (recordHistory && insight && !insight.isFallback) {
      try {
        const { data: existingHistory } = await req.supabase
          .from('daily_insight_history')
          .select('id')
          .eq('user_id', userId)
          .eq('insight_key', insight.key)
          .eq('shown_date', todayIso)
          .maybeSingle();

        if (!existingHistory) {
          await req.supabase.from('daily_insight_history').insert({
            user_id:     userId,
            insight_key: insight.key,
            shown_date:  todayIso,
            phase:       ctx.phase,
            pcos_tier:   ctx.pcosTier,
          });
        }
      } catch (histErr) {
        // Non-fatal — if the table doesn't exist yet (v5 migration not run),
        // we still want to serve the insight. Log and continue.
        console.warn('[daily-insight] history record failed:', histErr.message);
      }
    }

    return success(res, {
      insight: {
        key:          insight.key,
        title:        insight.title,
        body:         insight.body,
        actionLink:   insight.actionLink ?? null,
        isFallback:   insight.isFallback,
        score:        insight.score,
        source:       insight.source,
      },
      context: {
        phase:        ctx.phase,
        phaseSource:  ctx.phaseSource,
        userType:     ctx.userType,
        pcosTier:     ctx.pcosTier,
        confidence:   ctx.confidence,
        cycleDay:     ctx.cycleDay,
        contraceptive: {
          type:               ctx.contraceptive.type,
          isHormonal:         ctx.contraceptive.isHormonal,
          ovulationSuppressed: ctx.contraceptive.isHormonal,
        },
        latePathwayTriggered: ctx.latePathway?.triggered ?? false,
        // For UI surfaces that want to show "your patterns suggest PCOS, consider
        // talking to a doctor" — only fire ONCE when the tier first becomes 'likely'.
        pcosLikelyFirstSeen: ctx.pcosTier === 'likely' && ctx.profile.pcos_tier !== 'likely',
      },
    });
  } catch (error) { next(error); }
});


export default router;