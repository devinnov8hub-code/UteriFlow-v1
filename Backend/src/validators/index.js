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
    body('healthFocus.*').isIn(['irregular_periods','weight_management','mood_swings','acne','fertility','hair_issues','fatigue','other']).withMessage('One or more invalid health focus values'),
  ],
};

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
};
