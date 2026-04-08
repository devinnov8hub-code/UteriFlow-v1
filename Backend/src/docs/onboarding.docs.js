/**
 * @swagger
 * /api/v1/onboarding/name:
 *   post:
 *     summary: Set display name
 *     tags: [Onboarding]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [displayName]
 *             properties:
 *               displayName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 example: Tyress
 *     responses:
 *       200:
 *         description: Display name updated
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */

/**
 * @swagger
 * /api/v1/onboarding/age:
 *   post:
 *     summary: Set age group
 *     tags: [Onboarding]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ageGroup]
 *             properties:
 *               ageGroup:
 *                 type: string
 *                 enum: [15-29, 30-34, 35-39, 40-44, 45-49, 50-55]
 *                 example: 25-29
 *     responses:
 *       200: { description: Age group updated }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */

/**
 * @swagger
 * /api/v1/onboarding/hormonal-status:
 *   post:
 *     summary: Set hormonal / PCOS status
 *     tags: [Onboarding]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [hormonalStatus]
 *             properties:
 *               hormonalStatus:
 *                 type: string
 *                 enum: [diagnosed, suspected, not_sure, no]
 *                 example: suspected
 *     responses:
 *       200: { description: Hormonal status updated }
 *       401: { description: Unauthorized }
 */

/**
 * @swagger
 * /api/v1/onboarding/period-regularity:
 *   post:
 *     summary: Set period regularity
 *     tags: [Onboarding]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [periodRegularity]
 *             properties:
 *               periodRegularity:
 *                 type: string
 *                 enum: [regular, varies_week, unpredictable, not_tracked]
 *                 example: regular
 *     responses:
 *       200: { description: Period regularity updated }
 *       401: { description: Unauthorized }
 */

/**
 * @swagger
 * /api/v1/onboarding/health-focus:
 *   post:
 *     summary: Set health focus areas
 *     tags: [Onboarding]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [healthFocus]
 *             properties:
 *               healthFocus:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [irregular_periods, weight_management, mood_swings, acne, fertility, hair_issues, fatigue, other]
 *                 example: [irregular_periods, mood_swings]
 *     responses:
 *       200: { description: Health focus updated }
 *       401: { description: Unauthorized }
 */

/**
 * @swagger
 * /api/v1/onboarding/personality:
 *   post:
 *     summary: Set personality type and motivation style
 *     description: >
 *       Final onboarding personality step. personalityType and motivationStyle
 *       are used to personalise the dashboard tip, notification frequency,
 *       and community prompts shown to the user after onboarding.
 *     tags: [Onboarding]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [personalityType, motivationStyle]
 *             properties:
 *               personalityType:
 *                 type: string
 *                 enum: [cycle_sharer, health_optimizer, silent_tracker, community_seeker]
 *                 description: >
 *                   cycle_sharer — likes to share their experience;
 *                   health_optimizer — data-focused;
 *                   silent_tracker — private, just wants to track;
 *                   community_seeker — comes for support and connection
 *                 example: health_optimizer
 *               motivationStyle:
 *                 type: string
 *                 enum: [gentle_reminders, data_driven, community_support, minimal_nudges]
 *                 example: data_driven
 *               notificationPref:
 *                 type: string
 *                 enum: [all, important_only, none]
 *                 default: important_only
 *                 example: important_only
 *     responses:
 *       200:
 *         description: Personality preferences saved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 personalityType: { type: string }
 *                 motivationStyle: { type: string }
 *                 notificationPref: { type: string }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */

/**
 * @swagger
 * /api/v1/onboarding/complete:
 *   post:
 *     summary: Mark onboarding as complete
 *     description: Call after all onboarding steps are done. Triggers the welcome email.
 *     tags: [Onboarding]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Onboarding marked complete
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 onboardingCompleted: { type: boolean, example: true }
 *       401: { description: Unauthorized }
 */

/**
 * @swagger
 * /api/v1/onboarding/profile:
 *   get:
 *     summary: Get current user's full profile (onboarding use)
 *     tags: [Onboarding]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 profile:
 *                   $ref: '#/components/schemas/UserProfile'
 *       401: { description: Unauthorized }
 */
