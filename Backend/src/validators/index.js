import { body, param, query } from 'express-validator';


export const authValidators = {
  email: [
    body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }).withMessage('A valid email address is required'),
  ],
  verifyOtp: [
    body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }).withMessage('A valid email address is required'),
    body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Code must be exactly 6 digits'),
  ],
  createPassword: [
    body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }).withMessage('A valid email address is required'),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/\d/).withMessage('Password must contain at least one number')
      .matches(/[a-zA-Z]/).withMessage('Password must contain at least one letter'),
  ],
  verifyResetCode: [
    body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }).withMessage('A valid email address is required'),
    body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Reset code must be exactly 6 digits'),
  ],
  resetPassword: [
    body('resetToken').notEmpty().withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/\d/).withMessage('Password must contain at least one number')
      .matches(/[a-zA-Z]/).withMessage('Password must contain at least one letter'),
    body('confirmPassword')
      .notEmpty().withMessage('Please confirm your password')
      .custom((value, { req }) => {
        if (value !== req.body.password) throw new Error('Passwords do not match');
        return true;
      }),
  ],
};


export const onboardingValidators = {
  name: [
    body('displayName').trim().isLength({ min: 1, max: 50 }).withMessage('Display name must be between 1 and 50 characters'),
  ],
  age: [
    body('ageGroup').isIn(['15-29', '30-34', '35-39', '40-44', '45-49', '50-55']).withMessage('Invalid age group'),
  ],
  hormonalStatus: [
    body('hormonalStatus').isIn(['diagnosed', 'suspected', 'not_sure', 'no']).withMessage('Invalid hormonal status'),
  ],
  // PRD canonical PCOS field — accepts the PRD vocabulary (confirmed/suspected/none).
  // Either the legacy /hormonal-status or the new /pcos-status endpoint can be used;
  // they keep each other in sync server-side. New clients should prefer this one.
  pcosStatus: [
    body('pcosStatus').isIn(['confirmed', 'suspected', 'none']).withMessage('Invalid PCOS status. Use: confirmed | suspected | none'),
  ],
  periodRegularity: [
    body('periodRegularity').isIn(['regular', 'varies_week', 'unpredictable', 'not_tracked']).withMessage('Invalid period regularity value'),
  ],
  healthFocus: [
    body('healthFocus').isArray({ min: 1 }).withMessage('At least one health focus area is required'),
    body('healthFocus.*').isIn([
      'irregular_periods', 'weight_management', 'mood_swings', 'acne',
      'fertility', 'hair_issues', 'fatigue', 'other',
    ]).withMessage('One or more invalid health focus values'),
  ],

  cycleInfo: [
    body('lastPeriodDate').isISO8601().toDate().withMessage('lastPeriodDate must be a valid date'),

    body('periodLengthRange')
      .optional()
      .isIn(['1_2', '3_5', '6_8', '9_plus'])
      .withMessage('Invalid period length. Use: 1_2, 3_5, 6_8, or 9_plus'),

    body('cycleLengthRange')
      .optional()
      .isIn(['lt_21', '21_35', '36_60', 'gt_60'])
      .withMessage('Invalid cycle length. Use: lt_21, 21_35, 36_60, or gt_60'),
  ],

  // Bug 3 fix: contraceptive captured at onboarding
  contraceptive: [
    body('contraceptiveType').isIn([
      'none', 'combined_pill', 'mini_pill', 'hormonal_iud',
      'implant', 'injectable', 'other_hormonal', 'prefer_not_to_say',
    ]).withMessage('Invalid contraceptive type'),
  ],

  personality: [
    body('personalityType')
      .isIn(['cycle_sharer', 'health_optimizer', 'silent_tracker', 'community_seeker'])
      .withMessage('Invalid personality type'),
    body('motivationStyle')
      .isIn(['gentle_reminders', 'data_driven', 'community_support', 'minimal_nudges'])
      .withMessage('Invalid motivation style'),
    body('notificationPref')
      .optional()
      .isIn(['all', 'important_only', 'none'])
      .withMessage('Invalid notification preference'),
  ],
};


// Allowed values for the daily symptom checklist.
//
// Bug 4 fix: 'protected_sex', 'unprotected_sex', and 'started_changed_contraceptive'
// added so sexual activity and contraceptive changes can be logged the same way as
// cramps or fatigue (single tap, no separate clinical screen — matches Flo UX).
//
// Also added PCOS-relevant symptoms (excess_hair, hair_thinning,
// weight_gain_difficulty, skin_darkening, high_libido) that the PCOS Flag
// Evaluator and Symptom Intelligence Engine reference.
export const ALLOWED_SYMPTOMS = [
  // Existing core symptoms (production — DO NOT remove)
  'cramps', 'bloating', 'headache', 'backache', 'nausea',
  'fatigue', 'breast_tenderness', 'acne', 'mood_swings',
  'spotting', 'insomnia', 'food_cravings', 'hot_flashes',
  'fever', 'weight_gain', 'migraines',
  'heavy_flow', 'pelvic_pain', 'cravings', 'other',

  // PRD §4.4 — additional inference-engine symptom
  'high_libido',

  // PRD Appendix A — PCOS Flag Evaluator inputs (Flags E, G)
  'excess_hair',
  'hair_thinning',
  'weight_gain_difficulty',
  'skin_darkening',

  // PRD Bug 4 — sexual activity items (logged same as any other symptom)
  'protected_sex',
  'unprotected_sex',
  // Frontend "Sexual Activity" section (Cycle Day checklist) — additional
  // items that the daily-checklist UI surfaces alongside protected/unprotected
  // sex. Logged exactly like any other symptom (no engine side-effects).
  // Late-period pathway in cycleEngine.js still keys off `unprotected_sex`
  // only; these new items do not change engine routing.
  'pain_during_sex',
  'bleeding_after_sex',
  'spotting_after_sex',
  'low_libido',

  // PRD Bug 3 fix (c) — contraceptive change item; logging this also lets
  // the client send `contraceptiveType` in the same request to update the
  // user profile and re-route the engine in one step.
  'started_changed_contraceptive',

  // Frontend "Contraceptive Use" section (Cycle Day checklist) — daily
  // logging of which contraceptive method the user used today. These are
  // SEPARATE from the onboarding clinical `contraceptive_type` field on
  // user_profiles (which controls cycle-engine suppression). These items
  // are simple per-day tags and do NOT update the profile or trigger
  // hormonal-suppression routing — that pathway is reserved for
  // `started_changed_contraceptive` + `contraceptiveType` body field.
  'birth_control_pill',
  'morning_after_pill',
  'implant',
  'other_medication',
];


export const periodValidators = {
  logCreate: [
    body('startDate').isISO8601().toDate().withMessage('startDate must be a valid ISO 8601 date'),
    body('endDate').optional({ nullable: true }).isISO8601().toDate().withMessage('endDate must be a valid ISO 8601 date'),
    body('notes').optional({ nullable: true }).trim().isLength({ max: 1000 }).withMessage('Notes must be at most 1000 characters'),
  ],
  logUpdate: [
    param('id').isUUID().withMessage('Invalid period log ID'),
    body('startDate').optional().isISO8601().toDate().withMessage('startDate must be a valid ISO 8601 date'),
    body('endDate').optional({ nullable: true }).isISO8601().toDate().withMessage('endDate must be a valid ISO 8601 date'),
    body('notes').optional({ nullable: true }).trim().isLength({ max: 1000 }).withMessage('Notes must be at most 1000 characters'),
  ],
  logDelete: [param('id').isUUID().withMessage('Invalid period log ID')],
  pagination: [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).toInt().withMessage('Offset must be a non-negative integer'),
  ],
  // GET /period/symptoms/:date — date param validator
  // Accepts an ISO date string (YYYY-MM-DD); future dates are rejected because
  // a user cannot have logged how they felt on a day that hasn't happened yet.
  byDate: [
    param('date').isISO8601({ strict: true }).withMessage('date must be a valid ISO 8601 date (YYYY-MM-DD)')
      .custom((value) => {
        const todayIso = new Date().toISOString().split('T')[0];
        if (value > todayIso) {
          throw new Error('date cannot be in the future');
        }
        return true;
      }),
  ],
  symptomLog: [
    body('loggedDate').optional().isISO8601().toDate().withMessage('loggedDate must be a valid date')
      .custom((value) => {
        // Past dates are explicitly allowed (users frequently back-fill missed
        // logs from the previous days/weeks). Future dates are not — the user
        // cannot have logged how they felt on a day that hasn't happened yet.
        if (value && new Date(value) > new Date()) {
          throw new Error('loggedDate cannot be in the future');
        }
        return true;
      }),
    body('logId').optional({ nullable: true }).isUUID().withMessage('logId must be a valid UUID'),
    body('symptoms').isArray().withMessage('symptoms must be an array'),
    body('symptoms.*').isIn(ALLOWED_SYMPTOMS).withMessage('One or more invalid symptom values'),
    body('flowLevel').optional({ nullable: true })
      .isIn(['spotting', 'light', 'medium', 'heavy', 'very_heavy']).withMessage('Invalid flow level'),
    body('discharge').optional({ nullable: true })
      .isIn(['dry', 'sticky', 'creamy', 'watery', 'egg_white']).withMessage('Invalid discharge type'),
    body('mood').optional().isArray().withMessage('mood must be an array'),
    body('mood.*').isIn(['happy', 'sad', 'anxious', 'irritable', 'calm', 'energetic', 'depressed', 'emotional'])
      .withMessage('One or more invalid mood values'),
    body('painLevel').optional({ nullable: true }).isInt({ min: 0, max: 10 }).withMessage('Pain level must be between 0 and 10'),
    body('notes').optional({ nullable: true }).trim().isLength({ max: 1000 }),
    // Optional follow-up payload for the 'started_changed_contraceptive' symptom item.
    // When the user taps that item, the frontend should immediately ask which method
    // and forward it here so the engine can re-route on the same request.
    body('contraceptiveType').optional({ nullable: true }).isIn([
      'none', 'combined_pill', 'mini_pill', 'hormonal_iud',
      'implant', 'injectable', 'other_hormonal', 'prefer_not_to_say',
    ]).withMessage('Invalid contraceptive type'),
  ],
};


export const communityValidators = {
  pagination: [
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
    query('category').optional().isIn(['community', 'lifestyle_tips', 'discord']),
  ],
  uuidParam: [param('id').isUUID().withMessage('Invalid ID')],
  createComment: [
    body('content').trim().notEmpty().withMessage('Comment content is required').isLength({ max: 2000 }),
    body('parentId').optional({ nullable: true }).isUUID().withMessage('parentId must be a valid UUID'),
  ],
  reportPost: [
    body('reason').trim().notEmpty().isLength({ max: 500 }).withMessage('Reason is required'),
  ],
};


export const profileValidators = {
  update: [
    body('displayName').optional().trim().isLength({ min: 1, max: 50 }),
    body('bio').optional({ nullable: true }).trim().isLength({ max: 500 }),
    body('avatarUrl').optional({ nullable: true }).isURL().withMessage('avatarUrl must be a valid URL'),
    body('cycleLengthAvg').optional().isInt({ min: 14, max: 60 }),
    body('periodLengthAvg').optional().isInt({ min: 1, max: 14 }),
    body('notificationPref').optional().isIn(['all', 'important_only', 'none']),
    // Allow profile-level updates for these PRD-canonical fields too,
    // for the "Settings" screens that aren't part of onboarding.
    body('contraceptiveType').optional().isIn([
      'none', 'combined_pill', 'mini_pill', 'hormonal_iud',
      'implant', 'injectable', 'other_hormonal', 'prefer_not_to_say',
    ]).withMessage('Invalid contraceptive type'),
    body('pcosStatus').optional().isIn(['confirmed', 'suspected', 'none']),
  ],
};


export const notificationValidators = {
  pagination: [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
    query('unread_only').optional().isBoolean().toBoolean(),
  ],
};