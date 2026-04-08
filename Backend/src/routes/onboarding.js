import express from 'express';
import supabase from '../config/supabase.js';
import { authenticateUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { onboardingValidators } from '../validators/index.js';
import { body } from 'express-validator';
import { NotFoundError } from '../errors/index.js';
import { success } from '../utils/response.js';
import { sendOnboardingCompleteEmail } from '../utils/email.js';

const router = express.Router();
router.use(authenticateUser);

const updateProfile = async (userId, fields) => {
  const { error } = await supabase.from('user_profiles').update(fields).eq('id', userId);
  if (error) throw error;
};

// Step 1 — Display name
router.post('/name', onboardingValidators.name, validate, async (req, res, next) => {
  try {
    const { displayName } = req.body;
    await updateProfile(req.user.id, { display_name: displayName });
    return success(res, { message: 'Display name updated successfully', displayName });
  } catch (error) { next(error); }
});

// Step 2 — Age group
router.post('/age', onboardingValidators.age, validate, async (req, res, next) => {
  try {
    const { ageGroup } = req.body;
    await updateProfile(req.user.id, { age_group: ageGroup });
    return success(res, { message: 'Age group updated successfully', ageGroup });
  } catch (error) { next(error); }
});

// Step 3 — PCOS / hormonal status
router.post('/hormonal-status', onboardingValidators.hormonalStatus, validate, async (req, res, next) => {
  try {
    const { hormonalStatus } = req.body;
    await updateProfile(req.user.id, { hormonal_status: hormonalStatus });
    return success(res, { message: 'Hormonal status updated successfully', hormonalStatus });
  } catch (error) { next(error); }
});

// Step 4 — Last period date + cycle/period length (Figma screens 3, 4, 6)
// Screen: "When did your last period start?" (date picker)
// Screen: "How long does your period usually last?" (1-2 | 3-5 | 6-8 | 9+ days)
// Screen: "How long was your last cycle?" (< 21 | 21-35 | 36-60 | 60+ days)
router.post('/cycle-info', [
  body('lastPeriodDate').isISO8601().toDate().withMessage('lastPeriodDate must be a valid date'),
  body('periodLengthRange')
    .optional()
    .isIn(['1_2', '3_5', '6_8', '9_plus'])
    .withMessage('Invalid period length. Use: 1_2 | 3_5 | 6_8 | 9_plus'),
  body('cycleLengthRange')
    .optional()
    .isIn(['lt_21', '21_35', '36_60', 'gt_60'])
    .withMessage('Invalid cycle length. Use: lt_21 | 21_35 | 36_60 | gt_60'),
], validate, async (req, res, next) => {
  try {
    const { lastPeriodDate, periodLengthRange, cycleLengthRange } = req.body;
    const userId = req.user.id;

    // Map Figma range labels → midpoint integers used for cycle predictions
    const periodLengthMap = { '1_2': 2, '3_5': 4, '6_8': 7, '9_plus': 9 };
    const cycleLengthMap  = { 'lt_21': 18, '21_35': 28, '36_60': 45, 'gt_60': 65 };

    const profileUpdates = {};
    if (periodLengthRange) profileUpdates.period_length_avg = periodLengthMap[periodLengthRange];
    if (cycleLengthRange)  profileUpdates.cycle_length_avg  = cycleLengthMap[cycleLengthRange];
    if (Object.keys(profileUpdates).length) {
      await updateProfile(userId, profileUpdates);
    }

    // Seed first period log if none exists yet
    const { data: existingLog } = await supabase
      .from('period_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('is_first_log', true)
      .maybeSingle();

    if (!existingLog) {
      await supabase.from('period_logs').insert({
        user_id:      userId,
        start_date:   new Date(lastPeriodDate).toISOString().split('T')[0],
        is_first_log: true,
      });
    }

    return success(res, {
      message: 'Cycle information saved successfully',
      lastPeriodDate:    new Date(lastPeriodDate).toISOString().split('T')[0],
      periodLengthRange: periodLengthRange ?? null,
      cycleLengthRange:  cycleLengthRange  ?? null,
      periodLengthAvg:   periodLengthRange ? periodLengthMap[periodLengthRange] : null,
      cycleLengthAvg:    cycleLengthRange  ? cycleLengthMap[cycleLengthRange]   : null,
    });
  } catch (error) { next(error); }
});

// Step 5 — Period regularity
router.post('/period-regularity', onboardingValidators.periodRegularity, validate, async (req, res, next) => {
  try {
    const { periodRegularity } = req.body;
    await updateProfile(req.user.id, { period_regularity: periodRegularity });
    return success(res, { message: 'Period regularity updated successfully', periodRegularity });
  } catch (error) { next(error); }
});

// Step 6 — Health concerns / focus areas
router.post('/health-focus', onboardingValidators.healthFocus, validate, async (req, res, next) => {
  try {
    const { healthFocus } = req.body;
    await updateProfile(req.user.id, { health_focus: healthFocus });
    return success(res, { message: 'Health focus areas updated successfully', healthFocus });
  } catch (error) { next(error); }
});

// Step 7 — Personality + motivation style
router.post('/personality', onboardingValidators.personality, validate, async (req, res, next) => {
  try {
    const { personalityType, motivationStyle, notificationPref } = req.body;
    await updateProfile(req.user.id, {
      personality_type:  personalityType,
      motivation_style:  motivationStyle,
      notification_pref: notificationPref ?? 'important_only',
    });
    return success(res, {
      message: 'Personality preferences saved successfully',
      personalityType,
      motivationStyle,
      notificationPref: notificationPref ?? 'important_only',
    });
  } catch (error) { next(error); }
});

// Final — Mark onboarding complete
router.post('/complete', async (req, res, next) => {
  try {
    await updateProfile(req.user.id, {
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
    });

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email, display_name')
      .eq('id', req.user.id)
      .maybeSingle();

    if (profile) {
      sendOnboardingCompleteEmail(profile.email, profile.display_name)
        .catch((e) => console.error('[Email] Onboarding complete email failed:', e.message));
    }

    return success(res, { message: 'Onboarding completed successfully', onboardingCompleted: true });
  } catch (error) { next(error); }
});

// Get own profile (used at any onboarding step to prefill)
router.get('/profile', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', req.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('Profile not found');
    return success(res, { profile: data });
  } catch (error) { next(error); }
});

export default router;
