import express from 'express';
import supabase from '../config/supabase.js';
import { authenticateUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { onboardingValidators } from '../validators/index.js';
import { NotFoundError } from '../errors/index.js';
import { success } from '../utils/response.js';
import { sendOnboardingCompleteEmail } from '../utils/email.js';

const router = express.Router();

router.use(authenticateUser);

const updateProfile = async (userId, fields) => {
  const { error } = await supabase.from('user_profiles').update(fields).eq('id', userId);
  if (error) throw error;
};

router.post('/name', onboardingValidators.name, validate, async (req, res, next) => {
  try {
    const { displayName } = req.body;
    await updateProfile(req.user.id, { display_name: displayName });
    return success(res, { message: 'Display name updated successfully', displayName });
  } catch (error) { next(error); }
});

router.post('/age', onboardingValidators.age, validate, async (req, res, next) => {
  try {
    const { ageGroup } = req.body;
    await updateProfile(req.user.id, { age_group: ageGroup });
    return success(res, { message: 'Age group updated successfully', ageGroup });
  } catch (error) { next(error); }
});

router.post('/hormonal-status', onboardingValidators.hormonalStatus, validate, async (req, res, next) => {
  try {
    const { hormonalStatus } = req.body;
    await updateProfile(req.user.id, { hormonal_status: hormonalStatus });
    return success(res, { message: 'Hormonal status updated successfully', hormonalStatus });
  } catch (error) { next(error); }
});

router.post('/period-regularity', onboardingValidators.periodRegularity, validate, async (req, res, next) => {
  try {
    const { periodRegularity } = req.body;
    await updateProfile(req.user.id, { period_regularity: periodRegularity });
    return success(res, { message: 'Period regularity updated successfully', periodRegularity });
  } catch (error) { next(error); }
});

router.post('/health-focus', onboardingValidators.healthFocus, validate, async (req, res, next) => {
  try {
    const { healthFocus } = req.body;
    await updateProfile(req.user.id, { health_focus: healthFocus });
    return success(res, { message: 'Health focus areas updated successfully', healthFocus });
  } catch (error) { next(error); }
});

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

router.get('/profile', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('user_profiles').select('*').eq('id', req.user.id).maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('Profile not found');
    return success(res, { profile: data });
  } catch (error) { next(error); }
});

export default router;
