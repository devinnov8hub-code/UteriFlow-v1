/**
 * @swagger
 * /api/v1/onboarding/name:
 *   post:
 *     summary: Set display name
 *     description: Sets the user's display name for use in the community. Requires authentication.
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
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
 *         description: Display name updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 displayName:
 *                   type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/onboarding/age:
 *   post:
 *     summary: Set age group
 *     description: Sets the user's age group bracket. Requires authentication.
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
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
 *                 enum: [18-24, 25-29, 30-34, 35-39, 40-44, 45+]
 *                 example: 25-29
 *     responses:
 *       200:
 *         description: Age group updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 ageGroup:
 *                   type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/onboarding/hormonal-status:
 *   post:
 *     summary: Set hormonal diagnosis status
 *     description: Records the user's hormonal diagnosis or suspicion status. Requires authentication.
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
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
 *                 example: diagnosed
 *     responses:
 *       200:
 *         description: Hormonal status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 hormonalStatus:
 *                   type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/onboarding/period-regularity:
 *   post:
 *     summary: Set period regularity
 *     description: Records how regular the user's period cycle is. Requires authentication.
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
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
 *                 example: varies_week
 *     responses:
 *       200:
 *         description: Period regularity updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 periodRegularity:
 *                   type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/onboarding/health-focus:
 *   post:
 *     summary: Set health focus areas
 *     description: Sets one or more health concerns the user wants to focus on. Requires authentication.
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
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
 *                 minItems: 1
 *                 items:
 *                   type: string
 *                   enum: [irregular_periods, weight_management, mood_swings, acne, fertility, hair_issues, fatigue, other]
 *                 example: [irregular_periods, fatigue]
 *     responses:
 *       200:
 *         description: Health focus areas updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 healthFocus:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/onboarding/complete:
 *   post:
 *     summary: Mark onboarding as complete
 *     description: Flags the user's profile as fully onboarded. Requires authentication.
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 onboardingCompleted:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/onboarding/profile:
 *   get:
 *     summary: Get user profile and onboarding status
 *     description: Retrieves the complete user profile including onboarding state. Requires authentication.
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 profile:
 *                   $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
