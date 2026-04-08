
const servers = [
  {
    url: '/api/v1',
    description: 'Same origin',
  },
];

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'UteriFlow API',
    version: '1.0.0',
    description: 'Authentication, onboarding, and period tracking API for UteriFlow — powered by Supabase.',
    contact: { name: 'UteriFlow Team' },
  },
  servers,
  tags: [
    { name: 'Authentication', description: 'Register, login, OTP verification, token management' },
    { name: 'Onboarding',     description: 'Step-by-step user profile setup including personality' },
    { name: 'Period Tracking',description: 'Log cycles, symptoms, predictions and dashboard summary' },
    { name: 'Community',      description: 'User-facing posts, likes, bookmarks, comments' },
    { name: 'Profile',        description: 'View and update user profile' },
    { name: 'Notifications',  description: 'In-app notifications for the current user' },
    { name: 'Admin',          description: 'Admin-only: user management, stats, period log oversight' },
    { name: 'Admin Community',description: 'Admin-only: post/comment moderation and analytics' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http', scheme: 'bearer', bearerFormat: 'JWT',
        description: 'JWT access token from Supabase. Obtain via POST /auth/login or POST /auth/password/create.',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { error: { type: 'string' }, code: { type: 'string' } },
      },
      AuthUser: {
        type: 'object',
        properties: {
          id:        { type: 'string', format: 'uuid' },
          email:     { type: 'string', format: 'email' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Session: {
        type: 'object',
        properties: {
          accessToken:  { type: 'string', description: 'JWT — use as Bearer token' },
          refreshToken: { type: 'string' },
          expiresAt:    { type: 'integer', description: 'Unix timestamp' },
        },
      },
      UserProfile: {
        type: 'object',
        properties: {
          id:                      { type: 'string', format: 'uuid' },
          email:                   { type: 'string', format: 'email' },
          display_name:            { type: 'string', nullable: true },
          bio:                     { type: 'string', nullable: true },
          avatar_url:              { type: 'string', nullable: true },
          age_group:               { type: 'string', nullable: true },
          hormonal_status:         { type: 'string', nullable: true },
          period_regularity:       { type: 'string', nullable: true },
          health_focus:            { type: 'array', items: { type: 'string' } },
          personality_type:        { type: 'string', nullable: true },
          motivation_style:        { type: 'string', nullable: true },
          notification_pref:       { type: 'string', nullable: true },
          cycle_length_avg:        { type: 'integer', default: 28 },
          period_length_avg:       { type: 'integer', default: 5 },
          onboarding_completed:    { type: 'boolean' },
          onboarding_completed_at: { type: 'string', format: 'date-time', nullable: true },
          created_at:              { type: 'string', format: 'date-time' },
          updated_at:              { type: 'string', format: 'date-time' },
        },
      },
      PeriodLog: {
        type: 'object',
        properties: {
          id:           { type: 'string', format: 'uuid' },
          user_id:      { type: 'string', format: 'uuid' },
          start_date:   { type: 'string', format: 'date' },
          end_date:     { type: 'string', format: 'date', nullable: true },
          notes:        { type: 'string', nullable: true },
          is_first_log: { type: 'boolean' },
          created_at:   { type: 'string', format: 'date-time' },
          updated_at:   { type: 'string', format: 'date-time' },
        },
      },
      SymptomLog: {
        type: 'object',
        properties: {
          id:          { type: 'string', format: 'uuid' },
          user_id:     { type: 'string', format: 'uuid' },
          log_id:      { type: 'string', format: 'uuid', nullable: true },
          logged_date: { type: 'string', format: 'date' },
          symptoms:    { type: 'array', items: { type: 'string' } },
          flow_level:  { type: 'string', enum: ['spotting','light','medium','heavy','very_heavy'], nullable: true },
          discharge:   { type: 'string', enum: ['dry','sticky','creamy','egg_white'], nullable: true },
          mood:        { type: 'array', items: { type: 'string' } },
          pain_level:  { type: 'integer', nullable: true },
          notes:       { type: 'string', nullable: true },
          created_at:  { type: 'string', format: 'date-time' },
        },
      },
      CyclePrediction: {
        type: 'object',
        properties: {
          id:                   { type: 'string', format: 'uuid' },
          user_id:              { type: 'string', format: 'uuid' },
          predicted_start:      { type: 'string', format: 'date' },
          predicted_end:        { type: 'string', format: 'date', nullable: true },
          fertile_window_start: { type: 'string', format: 'date', nullable: true },
          fertile_window_end:   { type: 'string', format: 'date', nullable: true },
          ovulation_date:       { type: 'string', format: 'date', nullable: true },
          is_current:           { type: 'boolean' },
          created_at:           { type: 'string', format: 'date-time' },
        },
      },
      Post: {
        type: 'object',
        properties: {
          id:            { type: 'string', format: 'uuid' },
          author_id:     { type: 'string', format: 'uuid', nullable: true },
          author:        { type: 'object', nullable: true, properties: { id: { type: 'string' }, display_name: { type: 'string' }, avatar_url: { type: 'string', nullable: true } } },
          title:         { type: 'string' },
          content:       { type: 'string' },
          image_url:     { type: 'string', nullable: true },
          category:      { type: 'string', enum: ['community', 'lifestyle_tips', 'discord'] },
          likes_count:   { type: 'integer' },
          shares_count:  { type: 'integer' },
          is_flagged:    { type: 'boolean' },
          is_published:  { type: 'boolean' },
          is_liked:      { type: 'boolean', description: 'Whether the requesting user liked this post' },
          is_bookmarked: { type: 'boolean', description: 'Whether the requesting user bookmarked this post' },
          created_at:    { type: 'string', format: 'date-time' },
          updated_at:    { type: 'string', format: 'date-time' },
        },
      },
      Comment: {
        type: 'object',
        properties: {
          id:            { type: 'string', format: 'uuid' },
          post_id:       { type: 'string', format: 'uuid' },
          author_id:     { type: 'string', format: 'uuid', nullable: true },
          author:        { type: 'object', nullable: true, properties: { id: { type: 'string' }, display_name: { type: 'string' }, avatar_url: { type: 'string', nullable: true } } },
          parent_id:     { type: 'string', format: 'uuid', nullable: true },
          content:       { type: 'string' },
          is_flagged:    { type: 'boolean' },
          likes_count:   { type: 'integer' },
          replies_count: { type: 'integer' },
          created_at:    { type: 'string', format: 'date-time' },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id:         { type: 'string', format: 'uuid' },
          user_id:    { type: 'string', format: 'uuid' },
          type:       { type: 'string', enum: ['period_reminder','ovulation_reminder','cycle_summary','community_reply','community_like','community_mention','tip','system'] },
          title:      { type: 'string' },
          body:       { type: 'string' },
          data:       { type: 'object' },
          is_read:    { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          total:    { type: 'integer' },
          limit:    { type: 'integer' },
          offset:   { type: 'integer' },
          returned: { type: 'integer' },
        },
      },
    },
    responses: {
      ValidationError:   { description: 'Validation or business logic error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      Unauthorized:      { description: 'Missing or invalid JWT token',       content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      UnauthorizedError: { description: 'Missing or invalid JWT token',       content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      Forbidden:         { description: 'Forbidden — admin access required',  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, example: { error: 'Forbidden: admin access required', code: 'FORBIDDEN' } } } },
      NotFound:          { description: 'Resource not found',                 content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      NotFoundError:     { description: 'Resource not found',                 content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      ConflictError:     { description: 'Resource already exists',            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      ServerError:       { description: 'Internal server error',              content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
    },
  },
  security: [],

  // ── PATHS ──────────────────────────────────────────────────────────────────
  // Paths start AFTER /api/v1 — that prefix is already in the server URL above.
  // Writing /api/v1/auth/... here would produce /api/v1/api/v1/auth/... in Swagger.
  paths: {

    // ── AUTH ─────────────────────────────────────────────────────────────────
    '/auth/email/check': {
      post: {
        tags: ['Authentication'],
        summary: 'Check if an email is registered',
        description: 'Returns whether the email exists and which flow to follow — login or register.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
          } } } },
        },
        responses: {
          200: { description: 'Email check result', content: { 'application/json': { schema: { type: 'object', properties: {
            exists: { type: 'boolean' },
            flow:   { type: 'string', enum: ['login', 'register'] },
          } } } } },
          400: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },

    '/auth/email/send-otp': {
      post: {
        tags: ['Authentication'],
        summary: 'Send OTP to email',
        description: "Generates a 6-digit OTP, stores it with a 10-minute expiry, and sends it to the user's email.",
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
          } } } },
        },
        responses: {
          200: { description: 'OTP sent successfully', content: { 'application/json': { schema: { type: 'object', properties: {
            message:        { type: 'string' },
            verificationId: { type: 'string', format: 'uuid' },
          } } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    '/auth/email/verify': {
      post: {
        tags: ['Authentication'],
        summary: 'Verify the OTP code',
        description: 'Validates the 6-digit OTP for registration. Max 5 attempts before lockout.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['email', 'code'], properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            code:  { type: 'string', minLength: 6, maxLength: 6, example: '483920' },
          } } } },
        },
        responses: {
          200: { description: 'Email verified successfully', content: { 'application/json': { schema: { type: 'object', properties: {
            message:  { type: 'string' },
            verified: { type: 'boolean' },
            email:    { type: 'string' },
          } } } } },
          400: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },

    '/auth/email/resend': {
      post: {
        tags: ['Authentication'],
        summary: 'Resend OTP verification code',
        description: 'Invalidates previous unverified OTPs and sends a fresh 6-digit code.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
          } } } },
        },
        responses: {
          200: { description: 'OTP resent successfully', content: { 'application/json': { schema: { type: 'object', properties: {
            message:        { type: 'string' },
            verificationId: { type: 'string', format: 'uuid' },
          } } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    '/auth/password/create': {
      post: {
        tags: ['Authentication'],
        summary: 'Create account with password',
        description: 'Registers a new user after email OTP verification. Password must be at least 8 chars with one letter and one number.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: {
            email:    { type: 'string', format: 'email', example: 'user@example.com' },
            password: { type: 'string', minLength: 8, example: 'SecurePass1' },
          } } } },
        },
        responses: {
          201: { description: 'Account created successfully', content: { 'application/json': { schema: { type: 'object', properties: {
            message: { type: 'string' },
            user:    { $ref: '#/components/schemas/AuthUser' },
            session: { $ref: '#/components/schemas/Session' },
          } } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          409: { $ref: '#/components/responses/ConflictError' },
        },
      },
    },

    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Log in with email and password',
        description: 'Authenticates a registered user and returns a JWT access and refresh token pair.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: {
            email:    { type: 'string', format: 'email', example: 'user@example.com' },
            password: { type: 'string', example: 'SecurePass1' },
          } } } },
        },
        responses: {
          200: { description: 'Logged in successfully', content: { 'application/json': { schema: { type: 'object', properties: {
            message: { type: 'string' },
            user:    { $ref: '#/components/schemas/AuthUser' },
            session: { $ref: '#/components/schemas/Session' },
          } } } } },
          400: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },

    '/auth/token/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Refresh access token',
        description: 'Uses a valid refresh token to issue a new access and refresh token pair.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['refreshToken'], properties: {
            refreshToken: { type: 'string', example: 'your-refresh-token-here' },
          } } } },
        },
        responses: {
          200: { description: 'Token refreshed successfully', content: { 'application/json': { schema: { type: 'object', properties: {
            message: { type: 'string' },
            session: { $ref: '#/components/schemas/Session' },
          } } } } },
          400: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },

    '/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Log out current user',
        description: 'Invalidates the current session. Pass the Bearer token in the Authorization header.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Logged out successfully', content: { 'application/json': { schema: { type: 'object', properties: {
            message: { type: 'string' },
          } } } } },
        },
      },
    },

    '/auth/password/forgot': {
      post: {
        tags: ['Authentication'],
        summary: 'Step 1 of 3 — Send 6-digit reset code to email',
        description: 'Sends a reset code. Always returns the same response to prevent email enumeration. Code expires in 10 minutes.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
          } } } },
        },
        responses: {
          200: { description: 'Reset code sent (if account exists)', content: { 'application/json': { schema: { type: 'object', properties: {
            message: { type: 'string', example: 'If an account with this email exists, a 6-digit reset code has been sent to your email.' },
          } } } } },
          400: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },

    '/auth/password/verify-code': {
      post: {
        tags: ['Authentication'],
        summary: 'Step 2 of 3 — Verify the 6-digit reset code',
        description: 'Verifies the code (max 5 attempts). On success returns a resetToken to use in Step 3.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['email', 'code'], properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            code:  { type: 'string', minLength: 6, maxLength: 6, example: '739201' },
          } } } },
        },
        responses: {
          200: { description: 'Code verified — proceed to set new password', content: { 'application/json': { schema: { type: 'object', properties: {
            message:    { type: 'string', example: 'Code verified. You may now set a new password.' },
            resetToken: { type: 'string', format: 'uuid', description: 'Pass this to POST /auth/password/reset' },
            email:      { type: 'string', format: 'email' },
          } } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },

    '/auth/password/reset': {
      post: {
        tags: ['Authentication'],
        summary: 'Step 3 of 3 — Set new password',
        description: 'Sets a new password using the resetToken from Step 2. Token is burned after use.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['resetToken', 'password', 'confirmPassword'], properties: {
            resetToken:      { type: 'string', format: 'uuid', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' },
            password:        { type: 'string', minLength: 8, example: 'NewSecurePass1' },
            confirmPassword: { type: 'string', example: 'NewSecurePass1' },
          } } } },
        },
        responses: {
          200: { description: 'Password reset successfully', content: { 'application/json': { schema: { type: 'object', properties: {
            message: { type: 'string', example: 'Password reset successfully. You can now log in with your new password.' },
          } } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },

    // ── ONBOARDING ────────────────────────────────────────────────────────────
    '/onboarding/name': {
      post: {
        tags: ['Onboarding'],
        summary: 'Set display name',
        description: "Sets the user's display name for use in the community. Requires authentication.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['displayName'], properties: {
            displayName: { type: 'string', minLength: 1, maxLength: 50, example: 'Tyress' },
          } } } },
        },
        responses: {
          200: { description: 'Display name updated', content: { 'application/json': { schema: { type: 'object', properties: {
            message:     { type: 'string' },
            displayName: { type: 'string' },
          } } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/onboarding/age': {
      post: {
        tags: ['Onboarding'],
        summary: 'Set age group',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['ageGroup'], properties: {
            ageGroup: { type: 'string', enum: ['15-29', '30-34', '35-39', '40-44', '45-49', '50-55'], example: '15-29' },
          } } } },
        },
        responses: {
          200: { description: 'Age group updated', content: { 'application/json': { schema: { type: 'object', properties: {
            message:  { type: 'string' },
            ageGroup: { type: 'string' },
          } } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/onboarding/hormonal-status': {
      post: {
        tags: ['Onboarding'],
        summary: 'Set hormonal diagnosis status',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['hormonalStatus'], properties: {
            hormonalStatus: { type: 'string', enum: ['diagnosed', 'suspected', 'not_sure', 'no'], example: 'diagnosed' },
          } } } },
        },
        responses: {
          200: { description: 'Hormonal status updated', content: { 'application/json': { schema: { type: 'object', properties: {
            message:        { type: 'string' },
            hormonalStatus: { type: 'string' },
          } } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/onboarding/period-regularity': {
      post: {
        tags: ['Onboarding'],
        summary: 'Set period regularity',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['periodRegularity'], properties: {
            periodRegularity: { type: 'string', enum: ['regular', 'varies_week', 'unpredictable', 'not_tracked'], example: 'varies_week' },
          } } } },
        },
        responses: {
          200: { description: 'Period regularity updated', content: { 'application/json': { schema: { type: 'object', properties: {
            message:          { type: 'string' },
            periodRegularity: { type: 'string' },
          } } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/onboarding/health-focus': {
      post: {
        tags: ['Onboarding'],
        summary: 'Set health focus areas',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['healthFocus'], properties: {
            healthFocus: {
              type: 'array', minItems: 1,
              items: { type: 'string', enum: ['irregular_periods', 'weight_management', 'mood_swings', 'acne', 'fertility', 'hair_issues', 'fatigue', 'other'] },
              example: ['irregular_periods', 'fatigue'],
            },
          } } } },
        },
        responses: {
          200: { description: 'Health focus areas updated', content: { 'application/json': { schema: { type: 'object', properties: {
            message:     { type: 'string' },
            healthFocus: { type: 'array', items: { type: 'string' } },
          } } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/onboarding/complete': {
      post: {
        tags: ['Onboarding'],
        summary: 'Mark onboarding as complete',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Onboarding completed', content: { 'application/json': { schema: { type: 'object', properties: {
            message:             { type: 'string' },
            onboardingCompleted: { type: 'boolean' },
          } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/onboarding/profile': {
      get: {
        tags: ['Onboarding'],
        summary: 'Get user profile and onboarding status',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'User profile retrieved', content: { 'application/json': { schema: { type: 'object', properties: {
            profile: { $ref: '#/components/schemas/UserProfile' },
          } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ── PERIOD TRACKING ───────────────────────────────────────────────────────
    '/period/first-log': {
      post: {
        tags: ['Period Tracking'],
        summary: "Log the user's first period cycle",
        description: 'Records the very first period log. Only one first log is allowed per account.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['startDate'], properties: {
            startDate: { type: 'string', format: 'date', example: '2026-03-06' },
            notes:     { type: 'string', example: 'Mild cramps' },
          } } } },
        },
        responses: {
          201: { description: 'First period logged', content: { 'application/json': { schema: { type: 'object', properties: {
            message:   { type: 'string' },
            periodLog: { $ref: '#/components/schemas/PeriodLog' },
          } } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/period/log': {
      post: {
        tags: ['Period Tracking'],
        summary: 'Log a period cycle',
        description: 'Records a new period cycle with optional end date and notes.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['startDate'], properties: {
            startDate: { type: 'string', format: 'date', example: '2026-03-06' },
            endDate:   { type: 'string', format: 'date', example: '2026-03-10' },
            notes:     { type: 'string', example: 'Heavy flow on day 2' },
          } } } },
        },
        responses: {
          201: { description: 'Period logged', content: { 'application/json': { schema: { type: 'object', properties: {
            message:   { type: 'string' },
            periodLog: { $ref: '#/components/schemas/PeriodLog' },
          } } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/period/logs': {
      get: {
        tags: ['Period Tracking'],
        summary: 'Get all period logs for the authenticated user',
        description: 'Returns a paginated list of all period logs ordered by start date descending.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'limit',  schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 }, description: 'Number of records to return' },
          { in: 'query', name: 'offset', schema: { type: 'integer', default: 0,  minimum: 0 },               description: 'Number of records to skip' },
        ],
        responses: {
          200: { description: 'Period logs retrieved', content: { 'application/json': { schema: { type: 'object', properties: {
            periodLogs: { type: 'array', items: { $ref: '#/components/schemas/PeriodLog' } },
            total:      { type: 'integer' },
            limit:      { type: 'integer' },
            offset:     { type: 'integer' },
          } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/period/log/{id}': {
      put: {
        tags: ['Period Tracking'],
        summary: 'Update a period log',
        description: 'Updates any field of an existing period log. Only the owner can update.',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Period log ID' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: {
            startDate: { type: 'string', format: 'date' },
            endDate:   { type: 'string', format: 'date' },
            notes:     { type: 'string' },
          } } } },
        },
        responses: {
          200: { description: 'Period log updated', content: { 'application/json': { schema: { type: 'object', properties: {
            message:   { type: 'string' },
            periodLog: { $ref: '#/components/schemas/PeriodLog' },
          } } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Period Tracking'],
        summary: 'Delete a period log',
        description: 'Permanently deletes a period log. Only the owner can delete.',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Period log ID' }],
        responses: {
          200: { description: 'Period log deleted', content: { 'application/json': { schema: { type: 'object', properties: {
            message: { type: 'string' },
          } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },

      delete: {
        tags: ['Period Tracking'],
        summary: 'Delete a period log',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Period log deleted' },
          404: { $ref: '#/components/responses/NotFound' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      delete: {
        tags: ['Period Tracking'],
        summary: 'Delete a period log',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Period log deleted' },
          404: { $ref: '#/components/responses/NotFound' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ── ADMIN ─────────────────────────────────────────────────────────────────
    '/admin/stats': {
      get: {
        tags: ['Admin'],
        summary: 'Get platform dashboard statistics',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Platform statistics', content: { 'application/json': { schema: { type: 'object', properties: {
            overview: { type: 'object', properties: {
              totalUsers:        { type: 'integer' },
              onboardedUsers:    { type: 'integer' },
              onboardingRate:    { type: 'string', example: '72.3%' },
              newUsersLast7Days: { type: 'integer' },
              totalPeriodLogs:   { type: 'integer' },
            } },
            breakdowns: { type: 'object', properties: {
              hormonalStatus: { type: 'object' },
              ageGroup:       { type: 'object' },
            } },
          } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List all users (paginated)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'limit',                schema: { type: 'integer', default: 20 } },
          { in: 'query', name: 'offset',               schema: { type: 'integer', default: 0 } },
          { in: 'query', name: 'search',               schema: { type: 'string' },  description: 'Search by email or display name' },
          { in: 'query', name: 'onboarding_completed', schema: { type: 'boolean' } },
        ],
        responses: {
          200: { description: 'List of users' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/admin/users/{id}': {
      get: {
        tags: ['Admin'],
        summary: 'Get a single user by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'User profile' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Admin'],
        summary: "Update a user's profile (admin override)",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', properties: {
            display_name:         { type: 'string' },
            age_group:            { type: 'string', enum: ['18-24', '25-29', '30-34', '35-39', '40-44', '45+'] },
            hormonal_status:      { type: 'string', enum: ['diagnosed', 'suspected', 'not_sure', 'no'] },
            period_regularity:    { type: 'string', enum: ['regular', 'varies_week', 'unpredictable', 'not_tracked'] },
            onboarding_completed: { type: 'boolean' },
          } } } },
        },
        responses: {
          200: { description: 'Updated user profile' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Permanently delete a user',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'User deleted' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/admin/users/{id}/grant-admin': {
      post: {
        tags: ['Admin'],
        summary: 'Grant admin privileges to a user',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Admin privileges granted' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/admin/users/{id}/revoke-admin': {
      post: {
        tags: ['Admin'],
        summary: 'Revoke admin privileges from a user',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Admin privileges revoked' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/admin/period-logs': {
      get: {
        tags: ['Admin'],
        summary: 'List all period logs across all users (paginated)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'limit',   schema: { type: 'integer', default: 20 } },
          { in: 'query', name: 'offset',  schema: { type: 'integer', default: 0 } },
          { in: 'query', name: 'user_id', schema: { type: 'string', format: 'uuid' }, description: 'Filter by a specific user' },
        ],
        responses: {
          200: { description: 'List of period logs' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/admin/period-logs/{id}': {
      delete: {
        tags: ['Admin'],
        summary: 'Delete any period log by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Period log deleted' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/admin/posts': {
      get: {
        tags: ['Admin'],
        summary: 'List all community posts (paginated)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'limit',    schema: { type: 'integer', default: 20 } },
          { in: 'query', name: 'offset',   schema: { type: 'integer', default: 0 } },
          { in: 'query', name: 'category', schema: { type: 'string', enum: ['community', 'lifestyle_tips', 'discord', 'flagged'] } },
          { in: 'query', name: 'search',   schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'List of posts' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
      post: {
        tags: ['Admin'],
        summary: 'Create a community post',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['title', 'content', 'category'], properties: {
            title:     { type: 'string', maxLength: 200 },
            content:   { type: 'string' },
            category:  { type: 'string', enum: ['community', 'lifestyle_tips', 'discord'] },
            image_url: { type: 'string', format: 'uri' },
          } } } },
        },
        responses: {
          201: { description: 'Post created' },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },


    '/admin/posts-create': {
      post: {
        tags: ['Admin Community'],
        summary: 'Create a community post (admin)',
        description: 'Admin creates a post that appears in the community feed.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'content', 'category'],
                properties: {
                  title:     { type: 'string', maxLength: 200, example: 'Tips for managing PCOS naturally' },
                  content:   { type: 'string', example: 'Here are some evidence-based approaches...' },
                  category:  { type: 'string', enum: ['community','lifestyle_tips','discord'], example: 'lifestyle_tips' },
                  image_url: { type: 'string', format: 'uri', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Post created', content: { 'application/json': { schema: { type: 'object', properties: { post: { $ref: '#/components/schemas/Post' } } } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/admin/posts/{id}': {
      get: {
        tags: ['Admin'],
        summary: 'Get a single post by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Post detail' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Admin'],
        summary: 'Update a post',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', properties: {
            title:        { type: 'string' },
            content:      { type: 'string' },
            is_flagged:   { type: 'boolean' },
            is_published: { type: 'boolean' },
          } } } },
        },
        responses: {
          200: { description: 'Post updated' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Delete a post',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Post deleted' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/admin/posts-delete/{id}': {
      delete: {
        tags: ['Admin Community'],
        summary: 'Delete a post by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Post deleted' },
          404: { $ref: '#/components/responses/NotFound' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/admin/posts/{id}/comments': {
      get: {
        tags: ['Admin'],
        summary: 'Get comments for a post',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path',  name: 'id',     required: true, schema: { type: 'string', format: 'uuid' } },
          { in: 'query', name: 'limit',  schema: { type: 'integer', default: 50 } },
          { in: 'query', name: 'offset', schema: { type: 'integer', default: 0 } },
        ],
        responses: {
          200: { description: 'Comments list' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/admin/comments/{id}': {
      delete: {
        tags: ['Admin'],
        summary: 'Delete a comment',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Comment deleted' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/admin/comments/{id}/flag': {
      patch: {
        tags: ['Admin'],
        summary: 'Flag a comment',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Comment flagged' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/admin/analytics': {
      get: {
        tags: ['Admin'],
        summary: 'Get community analytics',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'days', schema: { type: 'integer', minimum: 1, maximum: 365, default: 30 }, description: 'Number of days to look back' },
        ],
        responses: {
          200: { description: 'Analytics data' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/admin/users/{id}/ban': {
      post: {
        tags: ['Admin'],
        summary: 'Ban a user',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['ban_type'], properties: {
            ban_type: { type: 'string', enum: ['temporary', 'permanent'] },
            reason:   { type: 'string', maxLength: 500 },
            days:     { type: 'integer', minimum: 1, maximum: 365, description: 'Required for temporary bans' },
          } } } },
        },
        responses: {
          201: { description: 'User banned' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Unban a user',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'User unbanned' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    // ── PERSONALITY (ONBOARDING) ─────────────────────────────────────────────
    '/onboarding/cycle-info': {
      post: {
        tags: ['Onboarding'],
        summary: 'Save last period date and cycle/period length estimates',
        description: 'Screens 6-8 in Figma. Saves the last period start date (seeds the first period log), how long the period usually lasts, and how long the cycle usually is. Used to compute the first cycle prediction.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['lastPeriodDate'],
                properties: {
                  lastPeriodDate: {
                    type: 'string', format: 'date', example: '2026-03-15',
                    description: 'Start date of the most recent period',
                  },
                  periodLengthRange: {
                    type: 'string',
                    enum: ['1_2', '3_5', '6_8', '9_plus'],
                    example: '3_5',
                    description: 'How long the period usually lasts. Maps to Figma options: 1_2 = 1-2 days, 3_5 = 3-5 days, 6_8 = 6-8 days, 9_plus = More than 9 days',
                  },
                  cycleLengthRange: {
                    type: 'string',
                    enum: ['lt_21', '21_35', '36_60', 'gt_60'],
                    example: '21_35',
                    description: 'How long the cycle usually lasts. Maps to Figma options: lt_21 = Less than 21 days, 21_35 = 21-35 days, 36_60 = 36-60 days, gt_60 = More than 60 days',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Cycle info saved and first period log seeded' },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/onboarding/personality': {
      post: {
        tags: ['Onboarding'],
        summary: 'Set personality type and motivation style',
        description: 'Saves personality_type, motivation_style, and notification_pref. These drive the dashboard personalised tip, notification frequency, and community prompts.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['personalityType', 'motivationStyle'],
                properties: {
                  personalityType: { type: 'string', enum: ['cycle_sharer', 'health_optimizer', 'silent_tracker', 'community_seeker'], example: 'health_optimizer' },
                  motivationStyle: { type: 'string', enum: ['gentle_reminders', 'data_driven', 'community_support', 'minimal_nudges'], example: 'data_driven' },
                  notificationPref: { type: 'string', enum: ['all', 'important_only', 'none'], default: 'important_only' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Personality preferences saved' },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ── SYMPTOMS ─────────────────────────────────────────────────────────────
    '/period/symptoms': {
      post: {
        tags: ['Period Tracking'],
        summary: 'Log symptoms for a day',
        description: 'Log physical symptoms, flow level, mood, and pain level. Optionally link to a period log via logId.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['symptoms'],
                properties: {
                  loggedDate: { type: 'string', format: 'date', example: '2026-04-03' },
                  logId: { type: 'string', format: 'uuid', nullable: true },
                  symptoms: {
                    type: 'array',
                    items: { type: 'string', enum: ['cramps','bloating','headache','backache','nausea','fatigue','breast_tenderness','acne','mood_swings','spotting','insomnia','food_cravings','hot_flashes','other'] },
                    example: ['cramps', 'fatigue'],
                  },
                  flowLevel: { type: 'string', enum: ['spotting','light','medium','heavy','very_heavy'], nullable: true, example: 'medium' },
                  mood: { type: 'array', items: { type: 'string', enum: ['happy','sad','anxious','irritable','calm','energetic','depressed','emotional'] }, example: ['anxious'] },
                  painLevel: { type: 'integer', minimum: 1, maximum: 10, nullable: true, example: 6 },
                  notes: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Symptoms logged', content: { 'application/json': { schema: { type: 'object', properties: { symptomLog: { $ref: '#/components/schemas/SymptomLog' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      get: {
        tags: ['Period Tracking'],
        summary: 'List symptom logs',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 30 } },
          { in: 'query', name: 'offset', schema: { type: 'integer', default: 0 } },
        ],
        responses: {
          200: { description: 'Symptom logs', content: { 'application/json': { schema: { type: 'object', properties: { symptoms: { type: 'array', items: { $ref: '#/components/schemas/SymptomLog' } }, total: { type: 'integer' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ── CYCLE PREDICTION ──────────────────────────────────────────────────────
    '/period/insights': {
      get: {
        tags: ['Period Tracking'],
        summary: 'Cycle insights and analytics (Screen 4 — Insights Dashboard)',
        description: 'Returns cycles tracked, longest/shortest cycle, average cycle length, bar chart history data, frequent symptoms, and recent logs for the calendar view.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Cycle insights',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    insights: {
                      type: 'object',
                      properties: {
                        cyclesTracked:       { type: 'integer' },
                        longestCycle:        { type: 'integer', nullable: true },
                        shortestCycle:       { type: 'integer', nullable: true },
                        averageCycleLength:  { type: 'integer', nullable: true },
                        cycleRange:          { type: 'string', nullable: true, example: '28–35 days' },
                        cycleHistory:        { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, days: { type: 'integer' }, startDate: { type: 'string' } } } },
                        recentLogs:          { type: 'array', items: { $ref: '#/components/schemas/PeriodLog' } },
                        prediction:          { $ref: '#/components/schemas/CyclePrediction' },
                        frequentSymptoms:    { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, count: { type: 'integer' } } } },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/period/prediction': {
      get: {
        tags: ['Period Tracking'],
        summary: 'Get current cycle prediction',
        description: 'Returns predicted next period start/end, ovulation date, and fertile window. Auto-recalculated on every period log.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Cycle prediction', content: { 'application/json': { schema: { type: 'object', properties: { prediction: { $ref: '#/components/schemas/CyclePrediction' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ── DASHBOARD SUMMARY ────────────────────────────────────────────────────
    '/period/summary': {
      get: {
        tags: ['Period Tracking'],
        summary: 'Home screen dashboard summary',
        description: 'Returns cycle phase, days until next period, personalised tip (driven by personality_type), today\'s symptoms, and current prediction. Primary endpoint for the app home screen.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Dashboard summary',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    summary: {
                      type: 'object',
                      properties: {
                        userName: { type: 'string' },
                        cyclePhase: { type: 'string', enum: ['menstrual', 'follicular', 'fertile', 'pms', 'unknown'] },
                        daysUntilPeriod: { type: 'integer', nullable: true },
                        prediction: { $ref: '#/components/schemas/CyclePrediction' },
                        lastPeriod: { $ref: '#/components/schemas/PeriodLog' },
                        todaySymptoms: { $ref: '#/components/schemas/SymptomLog' },
                        personalizedTip: { type: 'string' },
                        profile: {
                          type: 'object',
                          properties: {
                            personalityType: { type: 'string' },
                            motivationStyle: { type: 'string' },
                            healthFocus: { type: 'array', items: { type: 'string' } },
                            hormonalStatus: { type: 'string' },
                            cycleLengthAvg: { type: 'integer' },
                            periodLengthAvg: { type: 'integer' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ── COMMUNITY (USER-FACING) ───────────────────────────────────────────────
    '/community/posts': {
      get: {
        tags: ['Community'],
        summary: 'List published posts',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'category', schema: { type: 'string', enum: ['community', 'lifestyle_tips', 'discord'] } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
          { in: 'query', name: 'offset', schema: { type: 'integer', default: 0 } },
        ],
        responses: {
          200: { description: 'Posts with is_liked and is_bookmarked flags per user', content: { 'application/json': { schema: { type: 'object', properties: { posts: { type: 'array', items: { $ref: '#/components/schemas/Post' } }, pagination: { $ref: '#/components/schemas/Pagination' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/community/posts/{id}': {
      get: {
        tags: ['Community'],
        summary: 'Get a single post',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Post with comment count, is_liked, is_bookmarked', content: { 'application/json': { schema: { type: 'object', properties: { post: { $ref: '#/components/schemas/Post' } } } } } },
          404: { $ref: '#/components/responses/NotFound' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/community/posts/{id}/like': {
      post: {
        tags: ['Community'],
        summary: 'Toggle like on a post',
        description: 'If already liked, removes the like. Returns liked: true/false.',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Like toggled', content: { 'application/json': { schema: { type: 'object', properties: { liked: { type: 'boolean' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/community/posts/{id}/bookmark': {
      post: {
        tags: ['Community'],
        summary: 'Toggle bookmark on a post',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Bookmark toggled', content: { 'application/json': { schema: { type: 'object', properties: { bookmarked: { type: 'boolean' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/community/posts/{id}/comments': {
      get: {
        tags: ['Community'],
        summary: 'List top-level comments on a post',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 30 } },
          { in: 'query', name: 'offset', schema: { type: 'integer', default: 0 } },
        ],
        responses: {
          200: { description: 'Comments with author info', content: { 'application/json': { schema: { type: 'object', properties: { comments: { type: 'array', items: { $ref: '#/components/schemas/Comment' } }, pagination: { $ref: '#/components/schemas/Pagination' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Community'],
        summary: 'Post a comment or reply',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: {
                  content: { type: 'string', maxLength: 2000, example: 'This really helped me!' },
                  parentId: { type: 'string', format: 'uuid', nullable: true, description: 'Set to reply to another comment' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Comment created', content: { 'application/json': { schema: { type: 'object', properties: { comment: { $ref: '#/components/schemas/Comment' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/community/posts/{id}/report': {
      post: {
        tags: ['Community'],
        summary: 'Report a post',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['reason'], properties: { reason: { type: 'string', maxLength: 500 } } } } } },
        responses: {
          200: { description: 'Post reported and flagged for admin review' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/community/comments/{id}/replies': {
      get: {
        tags: ['Community'],
        summary: 'Get replies to a comment',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Replies list' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/community/comments/{id}/like': {
      post: {
        tags: ['Community'],
        summary: 'Toggle like on a comment',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Like toggled', content: { 'application/json': { schema: { type: 'object', properties: { liked: { type: 'boolean' } } } } } }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/community/bookmarks': {
      get: {
        tags: ['Community'],
        summary: 'List bookmarked posts',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
          { in: 'query', name: 'offset', schema: { type: 'integer', default: 0 } },
        ],
        responses: { 200: { description: 'Bookmarked posts' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },

    // ── PROFILE ───────────────────────────────────────────────────────────────
    '/profile': {
      get: {
        tags: ['Profile'],
        summary: 'Get own full profile with stats',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Profile with postsCount and bookmarksCount', content: { 'application/json': { schema: { type: 'object', properties: { profile: { allOf: [{ $ref: '#/components/schemas/UserProfile' }, { type: 'object', properties: { stats: { type: 'object', properties: { postsCount: { type: 'integer' }, bookmarksCount: { type: 'integer' } } } } }] } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      patch: {
        tags: ['Profile'],
        summary: 'Update own profile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  displayName: { type: 'string', maxLength: 50 },
                  bio: { type: 'string', maxLength: 500, nullable: true },
                  avatarUrl: { type: 'string', format: 'uri', nullable: true },
                  cycleLengthAvg: { type: 'integer', minimum: 14, maximum: 60, example: 28 },
                  periodLengthAvg: { type: 'integer', minimum: 1, maximum: 14, example: 5 },
                  notificationPref: { type: 'string', enum: ['all', 'important_only', 'none'] },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Profile updated' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/profile/{id}': {
      get: {
        tags: ['Profile'],
        summary: 'Get a public user profile',
        description: 'Returns limited public info. Used for community post author pages.',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Public profile with postsCount' },
          404: { $ref: '#/components/responses/NotFound' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/profile/change-password': {
      post: {
        tags: ['Profile'],
        summary: 'Change password (authenticated user)',
        description: 'Screen 4 Figma — "Create new password" from Edit Profile. Verifies the current password before updating. For security, the user should log in again after this.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword', 'confirmPassword'],
                properties: {
                  currentPassword:  { type: 'string', example: 'OldPass123', description: 'Current password for verification' },
                  newPassword:      { type: 'string', minLength: 8, example: 'NewPass456' },
                  confirmPassword:  { type: 'string', example: 'NewPass456' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password changed successfully' },
          400: { description: 'Current password incorrect or passwords do not match' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/profile/account': {
      delete: {
        tags: ['Profile'],
        summary: 'Delete own account and all data',
        description: 'Screen 4 Figma — "Delete my account and data" with confirmation modal. Requires password confirmation. Permanently deletes the user and all associated data via CASCADE.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['password'],
                properties: {
                  password: { type: 'string', description: 'Current password to confirm deletion' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Account and all data permanently deleted' },
          400: { description: 'Incorrect password' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/profile/export-data': {
      get: {
        tags: ['Profile'],
        summary: 'Export all user data (GDPR)',
        description: 'Screen 4 Figma — "Export Data" button. Returns all stored data for the user including period logs, symptoms, predictions, posts, comments and notifications.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Full user data export',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    exportedAt: { type: 'string', format: 'date-time' },
                    data: {
                      type: 'object',
                      properties: {
                        profile:       { $ref: '#/components/schemas/UserProfile' },
                        periodLogs:    { type: 'array', items: { $ref: '#/components/schemas/PeriodLog' } },
                        symptoms:      { type: 'array', items: { $ref: '#/components/schemas/SymptomLog' } },
                        predictions:   { type: 'array', items: { $ref: '#/components/schemas/CyclePrediction' } },
                        posts:         { type: 'array' },
                        comments:      { type: 'array' },
                        notifications: { type: 'array' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List notifications',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 30 } },
          { in: 'query', name: 'offset', schema: { type: 'integer', default: 0 } },
          { in: 'query', name: 'unread_only', schema: { type: 'boolean', default: false } },
        ],
        responses: {
          200: { description: 'Notifications with unreadCount', content: { 'application/json': { schema: { type: 'object', properties: { notifications: { type: 'array', items: { $ref: '#/components/schemas/Notification' } }, unreadCount: { type: 'integer' }, pagination: { $ref: '#/components/schemas/Pagination' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/notifications/read-all': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark all notifications as read',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'All marked read' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/notifications/{id}/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark one notification as read',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Notification marked read' }, 404: { $ref: '#/components/responses/NotFound' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/notifications/{id}': {
      delete: {
        tags: ['Notifications'],
        summary: 'Delete a notification',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Notification deleted' }, 404: { $ref: '#/components/responses/NotFound' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },

    // ── ADMIN: BAN + BROADCAST ────────────────────────────────────────────────
    '/admin/notifications/broadcast': {
      post: {
        tags: ['Admin'],
        summary: 'Broadcast notification to users',
        description: 'Sends a tip or system notification to all users or a specific list of user IDs. Leave userIds empty to broadcast to everyone.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'body', 'type'],
                properties: {
                  title: { type: 'string', example: 'Your period is coming up!' },
                  body: { type: 'string', example: 'Based on your cycle, your period is expected in 3 days.' },
                  type: { type: 'string', enum: ['tip', 'system'], example: 'tip' },
                  userIds: { type: 'array', items: { type: 'string', format: 'uuid' }, description: 'Leave empty to broadcast to all users' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Notification sent', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string', example: 'Notification sent to 142 user(s)' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/admin/comments/{id}/unflag': {
      patch: {
        tags: ['Admin Community'],
        summary: 'Remove flag from a comment',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Comment unflagged' }, 404: { $ref: '#/components/responses/NotFound' }, 403: { $ref: '#/components/responses/Forbidden' } },
      },
    },
    '/admin/analytics': {
      get: {
        tags: ['Admin Community'],
        summary: 'Community analytics',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'query', name: 'days', schema: { type: 'integer', minimum: 1, maximum: 365, default: 30 } }],
        responses: {
          200: {
            description: 'Analytics data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    period: { type: 'string' },
                    stats: { type: 'object', properties: { postsPublished: { type: 'integer' }, comments: { type: 'integer' }, activeUsers: { type: 'integer' }, flaggedPosts: { type: 'integer' }, flaggedComments: { type: 'integer' }, totalLikes: { type: 'integer' } } },
                    weeklyActivity: { type: 'array', items: { type: 'object', properties: { day: { type: 'string' }, posts: { type: 'integer' }, comments: { type: 'integer' }, likes: { type: 'integer' } } } },
                  },
                },
              },
            },
          },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
  },

  // ── SCHEMAS ───────────────────────────────────────────────────────────────
};
