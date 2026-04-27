import express from 'express';

import { authenticateUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { periodValidators } from '../validators/index.js';
import { NotFoundError, ConflictError, AppError } from '../errors/index.js';
import { success } from '../utils/response.js';

const router = express.Router();
router.use(authenticateUser);
function computePredictions(lastStart, cycleLengthAvg = 28, periodLengthAvg = 5) {
  const start = new Date(lastStart);
  const predictedStart = new Date(start);
  predictedStart.setDate(start.getDate() + cycleLengthAvg);

  const predictedEnd = new Date(predictedStart);
  predictedEnd.setDate(predictedStart.getDate() + periodLengthAvg - 1);

  
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
  
  const { data: profile } = await db
    .from('user_profiles')
    .select('cycle_length_avg, period_length_avg')
    .eq('id', userId)
    .maybeSingle();

  const cycleLengthAvg  = profile?.cycle_length_avg  ?? 28;
  const periodLengthAvg = profile?.period_length_avg ?? 5;

  
  const { data: lastLog } = await db
    .from('period_logs')
    .select('start_date')
    .eq('user_id', userId)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastLog) return null;

  const pred = computePredictions(lastLog.start_date, cycleLengthAvg, periodLengthAvg);

  
  await db
    .from('cycle_predictions')
    .update({ is_current: false })
    .eq('user_id', userId)
    .eq('is_current', true);

  
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

    const { data, error, count } = await req.supabase
      .from('period_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('start_date', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

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
router.post('/symptoms', periodValidators.symptomLog, validate, async (req, res, next) => {
  try {
    const { loggedDate, logId, symptoms, flowLevel, discharge, mood, painLevel, notes } = req.body;
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
    return success(res, { message: 'Symptoms logged successfully', symptomLog: data }, existing ? 200 : 201);
  } catch (error) { next(error); }
});


// GET /period/symptoms — paginated list of all symptom entries for the logged-in user
// The `id` field is included so the frontend can reference specific entries.
router.get('/symptoms', periodValidators.pagination, validate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit  = req.query.limit  ?? 30;
    const offset = req.query.offset ?? 0;

    const { data, count, error } = await req.supabase
      .from('period_symptoms')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('logged_date', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    return success(res, { symptoms: data ?? [], total: count ?? 0, limit, offset });
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


router.get('/prediction', async (req, res, next) => {
  try {
    const userId = req.user.id;

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


router.get('/summary', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today  = new Date().toISOString().split('T')[0];

  
    const { data: profile } = await req.supabase
      .from('user_profiles')
      .select('display_name, personality_type, motivation_style, health_focus, hormonal_status, cycle_length_avg, period_length_avg')
      .eq('id', userId)
      .maybeSingle();

   
    const { data: prediction } = await req.supabase
      .from('cycle_predictions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_current', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

  
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

  
    let cyclePhase = 'unknown';
    let daysUntilPeriod = null;

    if (prediction) {
      const predStart  = new Date(prediction.predicted_start);
      const fertStart  = new Date(prediction.fertile_window_start);
      const fertEnd    = new Date(prediction.fertile_window_end);
      const todayDate  = new Date(today);

      const msPerDay = 86400000;
      daysUntilPeriod = Math.round((predStart - todayDate) / msPerDay);

      if (lastLog) {
        const logStart     = new Date(lastLog.start_date);
        const daysSinceLog = Math.round((todayDate - logStart) / msPerDay);
        const periodLength = profile?.period_length_avg ?? 5;

        if (daysSinceLog >= 0 && daysSinceLog < periodLength) {
          cyclePhase = 'menstrual';
        } else if (todayDate >= fertStart && todayDate <= fertEnd) {
          cyclePhase = 'fertile';
        } else if (daysUntilPeriod <= 7 && daysUntilPeriod >= 0) {
          cyclePhase = 'pms';
        } else {
          cyclePhase = 'follicular';
        }
      }
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
        userName:         profile?.display_name,
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
          cycleLengthAvg:   profile?.cycle_length_avg ?? 28,
          periodLengthAvg:  profile?.period_length_avg ?? 5,
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

export default router;
