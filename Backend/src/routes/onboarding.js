import express from 'express';
import supabase from '../config/supabase.js';
import { authenticateUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { onboardingValidators } from '../validators/index.js';
import { body } from 'express-validator';
import { NotFoundError } from '../errors/index.js';
import { success } from '../utils/response.js';
import { sendOnboardingCompleteEmail } from '../utils/email.js';
import {
  mapHormonalToPcos, mapPcosToHormonal,
  PERIOD_LENGTH_MIDPOINT, CYCLE_LENGTH_MIDPOINT,
} from '../utils/cycleEngine.js';

const router = express.Router();
router.use(authenticateUser);

const updateProfile = async (db, userId, fields) => {
  const { error } = await db.from('user_profiles').update(fields).eq('id', userId);
  if (error) throw error;
};

// Step 1 — Display name
router.post('/name', onboardingValidators.name, validate, async (req, res, next) => {
  try {
    const { displayName } = req.body;
    await updateProfile(req.supabase, req.user.id, { display_name: displayName });
    return success(res, { message: 'Display name updated successfully', displayName });
  } catch (error) { next(error); }
});

// Step 2 — Age group
router.post('/age', onboardingValidators.age, validate, async (req, res, next) => {
  try {
    const { ageGroup } = req.body;
    await updateProfile(req.supabase, req.user.id, { age_group: ageGroup });
    return success(res, { message: 'Age group updated successfully', ageGroup });
  } catch (error) { next(error); }
});

// Step 3a — PCOS / hormonal status (legacy endpoint, kept for production clients)
//
// BUG 1 FIX: this endpoint previously stored the answer in `hormonal_status` only,
// which the PRD insight engine doesn't read. Now it also writes the canonical
// `pcos_status` field via mapHormonalToPcos so the engine can route PCOS users
// to the correct insight track immediately.
//
//   hormonal_status='diagnosed' → pcos_status='confirmed'  (PCOS track on)
//   hormonal_status='suspected' → pcos_status='suspected'  (watch flags)
//   hormonal_status='not_sure'  → pcos_status='none'       (standard track, flags accumulate)
//   hormonal_status='no'        → pcos_status='none'       (standard track)
router.post('/hormonal-status', onboardingValidators.hormonalStatus, validate, async (req, res, next) => {
  try {
    const { hormonalStatus } = req.body;
    const pcosStatus = mapHormonalToPcos(hormonalStatus);
    await updateProfile(req.supabase, req.user.id, {
      hormonal_status: hormonalStatus,
      pcos_status:     pcosStatus,
      // pcos_tier mirrors a confirmed declaration. Otherwise we leave it for
      // the flag evaluator to update later as the user logs cycles/symptoms.
      ...(pcosStatus === 'confirmed' ? { pcos_tier: 'confirmed' } : {}),
    });
    return success(res, {
      message: 'Hormonal status updated successfully',
      hormonalStatus,
      pcosStatus,
    });
  } catch (error) { next(error); }
});

// Step 3b — PCOS status (PRD canonical endpoint, NEW — preferred for new clients)
//
// Same data as /hormonal-status but uses the PRD vocabulary.
// Either endpoint can be used; both keep both columns in sync.
router.post('/pcos-status', onboardingValidators.pcosStatus, validate, async (req, res, next) => {
  try {
    const { pcosStatus } = req.body;
    const hormonalStatus = mapPcosToHormonal(pcosStatus);
    await updateProfile(req.supabase, req.user.id, {
      pcos_status:     pcosStatus,
      hormonal_status: hormonalStatus,
      ...(pcosStatus === 'confirmed' ? { pcos_tier: 'confirmed' } : {}),
    });
    return success(res, {
      message: 'PCOS status updated successfully',
      pcosStatus,
      hormonalStatus,
    });
  } catch (error) { next(error); }
});

// Step 4 — Last period date + cycle/period length (Figma screens 3, 4, 6)
//
// BUG 2 FIX:
//   (a) All three onboarding fields (last_period_start, cycle_length_range,
//       period_length_range) are now persisted to user_profiles, not just the
//       midpoint integers.
//   (b) If cycle/period length is not provided, we store NULL — never default
//       to 28 / 5. The PRD explicitly forbids assuming a 28-day cycle.
//   (c) The seeded period_logs entry is preserved (production behaviour) so
//       existing clients keep working.
router.post('/cycle-info', onboardingValidators.cycleInfo, validate, async (req, res, next) => {
  try {
    const { lastPeriodDate, periodLengthRange, cycleLengthRange } = req.body;
    const userId = req.user.id;

    const lastPeriodIso = new Date(lastPeriodDate).toISOString().split('T')[0];

    const profileUpdates = {
      last_period_start: lastPeriodIso,
    };
    if (periodLengthRange) {
      profileUpdates.period_length_range = periodLengthRange;
      profileUpdates.period_length_avg   = PERIOD_LENGTH_MIDPOINT[periodLengthRange];
    }
    if (cycleLengthRange) {
      profileUpdates.cycle_length_range = cycleLengthRange;
      profileUpdates.cycle_length_avg   = CYCLE_LENGTH_MIDPOINT[cycleLengthRange];
    }
    // Note: when the user does NOT provide a range, we deliberately do NOT
    // touch cycle_length_avg/period_length_avg. After v5 migration the column
    // default is dropped, so for new users the field stays NULL — which the
    // engine reads as "we don't know yet, use low confidence".

    await updateProfile(req.supabase, userId, profileUpdates);

    // Seed first period log if none exists yet (preserves production behaviour)
    const { data: existingLog } = await req.supabase
      .from('period_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('is_first_log', true)
      .maybeSingle();

    if (!existingLog) {
      await req.supabase.from('period_logs').insert({
        user_id:      userId,
        start_date:   lastPeriodIso,
        is_first_log: true,
      });
    }

    return success(res, {
      message: 'Cycle information saved successfully',
      lastPeriodDate:    lastPeriodIso,
      periodLengthRange: periodLengthRange ?? null,
      cycleLengthRange:  cycleLengthRange  ?? null,
      periodLengthAvg:   periodLengthRange ? PERIOD_LENGTH_MIDPOINT[periodLengthRange] : null,
      cycleLengthAvg:    cycleLengthRange  ? CYCLE_LENGTH_MIDPOINT[cycleLengthRange]   : null,
    });
  } catch (error) { next(error); }
});

// Step 5 — Period regularity
router.post('/period-regularity', onboardingValidators.periodRegularity, validate, async (req, res, next) => {
  try {
    const { periodRegularity } = req.body;
    // PRD Bug 2 fix (c): if user picks irregular/unsure, classify them
    // immediately — don't wait for cycle data to accumulate.
    const updates = { period_regularity: periodRegularity };
    if (periodRegularity !== 'regular') {
      updates.user_type = 'IRREGULAR';
    }
    await updateProfile(req.supabase, req.user.id, updates);
    return success(res, { message: 'Period regularity updated successfully', periodRegularity });
  } catch (error) { next(error); }
});

// Step 6 — Health concerns / focus areas
router.post('/health-focus', onboardingValidators.healthFocus, validate, async (req, res, next) => {
  try {
    const { healthFocus } = req.body;
    await updateProfile(req.supabase, req.user.id, { health_focus: healthFocus });
    return success(res, { message: 'Health focus areas updated successfully', healthFocus });
  } catch (error) { next(error); }
});

// Step 7 — Personality + motivation style
router.post('/personality', onboardingValidators.personality, validate, async (req, res, next) => {
  try {
    const { personalityType, motivationStyle, notificationPref } = req.body;
    await updateProfile(req.supabase, req.user.id, {
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

// Step 8 — Contraceptive type (NEW — Bug 3 fix)
//
// BUG 3 FIX (a): Adds the missing onboarding question that captures whether
// the user is on hormonal birth control. Without this, the engine was applying
// natural-cycle logic to suppressed cycles and showing fertility content to
// users on the pill / IUD / implant.
//
// Engine behavior triggered by this field is implemented in:
//   - utils/cycleEngine.js → isHormonalContraceptive()
//   - utils/insightEngine.js → contraceptive filter
//   - routes/period.js → /summary, /daily-insight (suppress ovulation/fertile)
router.post('/contraceptive', onboardingValidators.contraceptive, validate, async (req, res, next) => {
  try {
    const { contraceptiveType } = req.body;
    await updateProfile(req.supabase, req.user.id, {
      contraceptive_type:       contraceptiveType,
      contraceptive_changed_at: new Date().toISOString(),
    });
    return success(res, {
      message: 'Contraceptive type saved successfully',
      contraceptiveType,
    });
  } catch (error) { next(error); }
});

// Final — Mark onboarding complete
//
// BUG 2 FIX (a) post-validation: after marking complete, we run the
// onboarding_validation_check() SQL function (added in v5 migration). If
// any required fields are missing we LOG the error to stderr (so it shows
// up in Vercel/Supabase logs), but we still return success — the user has
// done their part, the failure is on us. The frontend can call /profile
// to see what's missing and prompt the user to fill it in later.
router.post('/complete', async (req, res, next) => {
  try {
    await updateProfile(req.supabase, req.user.id, {
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
    });

    // Post-onboarding null-check (Bug 2 fix b)
    try {
      const { data: missingFields } = await req.supabase
        .rpc('onboarding_validation_check', { p_user_id: req.user.id });
      if (Array.isArray(missingFields) && missingFields.length > 0) {
        console.error('[Onboarding Validation]', {
          userId: req.user.id,
          missing: missingFields,
        });
      }
    } catch (validationErr) {
      // The RPC may not exist yet if v5 migration hasn't run — don't break completion
      console.warn('[Onboarding Validation] check skipped:', validationErr.message);
    }

    const { data: profile } = await req.supabase
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
    const { data, error } = await req.supabase
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
