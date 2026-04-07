import { body, param, query } from 'express-validator';

// ─── Auth ──────────────────────────────────────────────────────
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

// ─── Onboarding ────────────────────────────────────────────────
export const onboardingValidators = {
  name: [
    body('displayName').trim().isLength({ min: 1, max: 50 }).withMessage('Display name must be between 1 and 50 characters'),
  ],
  age: [
    body('ageGroup').isIn(['18-24', '25-29', '30-34', '35-39', '40-44', '45+']).withMessage('Invalid age group'),
  ],
  hormonalStatus: [
    body('hormonalStatus').isIn(['diagnosed', 'suspected', 'not_sure', 'no']).withMessage('Invalid hormonal status'),
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

// ─── Period ─────────────────────────────────────────────────────
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
  symptomLog: [
    body('loggedDate').optional().isISO8601().toDate().withMessage('loggedDate must be a valid date'),
    body('logId').optional({ nullable: true }).isUUID().withMessage('logId must be a valid UUID'),
    body('symptoms').isArray().withMessage('symptoms must be an array'),
    body('symptoms.*').isIn([
      'cramps', 'bloating', 'headache', 'backache', 'nausea',
      'fatigue', 'breast_tenderness', 'acne', 'mood_swings',
      'spotting', 'insomnia', 'food_cravings', 'hot_flashes', 'other',
    ]).withMessage('One or more invalid symptom values'),
    body('flowLevel').optional({ nullable: true })
      .isIn(['spotting', 'light', 'medium', 'heavy', 'very_heavy']).withMessage('Invalid flow level'),
    body('mood').optional().isArray().withMessage('mood must be an array'),
    body('mood.*').isIn(['happy', 'sad', 'anxious', 'irritable', 'calm', 'energetic', 'depressed', 'emotional'])
      .withMessage('One or more invalid mood values'),
    body('painLevel').optional({ nullable: true }).isInt({ min: 1, max: 10 }).withMessage('Pain level must be between 1 and 10'),
    body('notes').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  ],
};

// ─── Community (user-facing) ────────────────────────────────────
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

// ─── Profile ────────────────────────────────────────────────────
export const profileValidators = {
  update: [
    body('displayName').optional().trim().isLength({ min: 1, max: 50 }),
    body('bio').optional({ nullable: true }).trim().isLength({ max: 500 }),
    body('avatarUrl').optional({ nullable: true }).isURL().withMessage('avatarUrl must be a valid URL'),
    body('cycleLengthAvg').optional().isInt({ min: 14, max: 60 }),
    body('periodLengthAvg').optional().isInt({ min: 1, max: 14 }),
    body('notificationPref').optional().isIn(['all', 'important_only', 'none']),
  ],
};

// ─── Notifications ──────────────────────────────────────────────
export const notificationValidators = {
  pagination: [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
    query('unread_only').optional().isBoolean().toBoolean(),
  ],
};
