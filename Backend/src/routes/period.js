import express from 'express';
import supabase from '../config/supabase.js';
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

async function refreshPredictions(userId) {
  
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('cycle_length_avg, period_length_avg')
    .eq('id', userId)
    .maybeSingle();

  const cycleLengthAvg  = profile?.cycle_length_avg  ?? 28;
  const periodLengthAvg = profile?.period_length_avg ?? 5;

  
  const { data: lastLog } = await supabase
    .from('period_logs')
    .select('start_date')
    .eq('user_id', userId)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastLog) return null;

  const pred = computePredictions(lastLog.start_date, cycleLengthAvg, periodLengthAvg);

  
  await supabase
    .from('cycle_predictions')
    .update({ is_current: false })
    .eq('user_id', userId)
    .eq('is_current', true);

  
  const { data } = await supabase
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

    const { data: existingLog, error: checkError } = await supabase
      .from('period_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('is_first_log', true)
      .maybeSingle();
    if (checkError) throw checkError;
    if (existingLog) throw new ConflictError('First period has already been logged');

    const { data, error } = await supabase
      .from('period_logs')
      .insert({ user_id: userId, start_date: startDate, notes: notes ?? null, is_first_log: true })
      .select()
      .single();
    if (error) throw error;

    
    await refreshPredictions(userId).catch(() => {});

    return success(res, { message: 'First period logged successfully', periodLog: data }, 201);
  } catch (error) { next(error); }
});


router.post('/log', periodValidators.logCreate, validate, async (req, res, next) => {
  try {
    const { startDate, endDate, notes } = req.body;
    const userId = req.user.id;

    const { data, error } = await supabase
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

    
    await refreshPredictions(userId).catch(() => {});

    return success(res, { message: 'Period logged successfully', periodLog: data }, 201);
  } catch (error) { next(error); }
});


router.get('/logs', periodValidators.pagination, validate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit  = req.query.limit  ?? 10;
    const offset = req.query.offset ?? 0;

    const { data, error, count } = await supabase
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

    const { data, error } = await supabase
      .from('period_logs')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data)  throw new NotFoundError('Period log not found');

    await refreshPredictions(userId).catch(() => {});

    return success(res, { message: 'Period log updated successfully', periodLog: data });
  } catch (error) { next(error); }
});


router.delete('/log/:id', periodValidators.logDelete, validate, async (req, res, next) => {
  try {
    const { id }    = req.params;
    const userId    = req.user.id;

    const { data, error } = await supabase
      .from('period_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data)  throw new NotFoundError('Period log not found');

    await refreshPredictions(userId).catch(() => {});

    return success(res, { message: 'Period log deleted successfully' });
  } catch (error) { next(error); }
});

router.post('/symptoms', periodValidators.symptomLog, validate, async (req, res, next) => {
  try {
    const { loggedDate, logId, symptoms, flowLevel, discharge, mood, painLevel, notes } = req.body;
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('period_symptoms')
      .insert({
        user_id:     userId,
        log_id:      logId     ?? null,
        logged_date: loggedDate ?? new Date().toISOString().split('T')[0],
        symptoms:    symptoms  ?? [],
        flow_level:  flowLevel ?? null,
        discharge:   discharge ?? null,
        mood:        mood      ?? [],
        pain_level:  painLevel ?? null,
        notes:       notes     ?? null,
      })
      .select()
      .single();
    if (error) throw error;

    return success(res, { message: 'Symptoms logged successfully', symptomLog: data }, 201);
  } catch (error) { next(error); }
});


router.get('/symptoms', periodValidators.pagination, validate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit  = req.query.limit  ?? 30;
    const offset = req.query.offset ?? 0;

    const { data, count, error } = await supabase
      .from('period_symptoms')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('logged_date', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    return success(res, { symptoms: data, total: count, limit, offset });
  } catch (error) { next(error); }
});


router.get('/prediction', async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data: prediction, error } = await supabase
      .from('cycle_predictions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_current', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;

    if (!prediction) {
      
      const computed = await refreshPredictions(userId);
      return success(res, { prediction: computed ?? null });
    }

    return success(res, { prediction });
  } catch (error) { next(error); }
});


router.get('/summary', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today  = new Date().toISOString().split('T')[0];

  
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('display_name, personality_type, motivation_style, health_focus, hormonal_status, cycle_length_avg, period_length_avg')
      .eq('id', userId)
      .maybeSingle();

   
    const { data: prediction } = await supabase
      .from('cycle_predictions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_current', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

  
    const { data: lastLog } = await supabase
      .from('period_logs')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

  
    const { data: todaySymptoms } = await supabase
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

export default router;


router.get('/insights', async (req, res, next) => {
  try {
    const userId = req.user.id;

    
    const { data: logs, error: logsError } = await supabase
      .from('period_logs')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: true });
    if (logsError) throw logsError;

    if (!logs || logs.length === 0) {
      return success(res, {
        insights: {
          cyclesTracked: 0,
          longestCycle: null,
          shortestCycle: null,
          averageCycleLength: null,
          cycleHistory: [],
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
    const averageCycleLength = cyclesTracked > 0 ? Math.round(totalLength / cyclesTracked) : null;

   
    const { data: allSymptoms } = await supabase
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
  
    const { data: prediction } = await supabase
      .from('cycle_predictions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_current', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

   
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('personality_type, cycle_length_avg')
      .eq('id', userId)
      .maybeSingle();

    const cycleRange = cyclesTracked > 1
      ? `${shortestCycle}–${longestCycle} days`
      : null;

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
