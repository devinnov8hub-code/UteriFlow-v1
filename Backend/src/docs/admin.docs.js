/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only endpoints (requires is_admin in user_metadata)
 */

/**
 * @swagger
 * /api/v1/admin/stats:
 *   get:
 *     summary: Get platform dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 overview:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                     onboardedUsers:
 *                       type: integer
 *                     onboardingRate:
 *                       type: string
 *                       example: "72.3%"
 *                     newUsersLast7Days:
 *                       type: integer
 *                     totalPeriodLogs:
 *                       type: integer
 *                 breakdowns:
 *                   type: object
 *                   properties:
 *                     hormonalStatus:
 *                       type: object
 *                     ageGroup:
 *                       type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: List all users (paginated)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by email or display name
 *       - in: query
 *         name: onboarding_completed
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   get:
 *     summary: Get a single user by ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User profile
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   patch:
 *     summary: Update a user's profile (admin override)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               display_name:
 *                 type: string
 *               age_group:
 *                 type: string
 *                 enum: [18-24, 25-29, 30-34, 35-39, 40-44, 45+]
 *               hormonal_status:
 *                 type: string
 *                 enum: [diagnosed, suspected, not_sure, no]
 *               period_regularity:
 *                 type: string
 *                 enum: [regular, varies_week, unpredictable, not_tracked]
 *               onboarding_completed:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated user profile
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     summary: Permanently delete a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User deleted
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /api/v1/admin/users/{id}/grant-admin:
 *   post:
 *     summary: Grant admin privileges to a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Admin privileges granted
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /api/v1/admin/users/{id}/revoke-admin:
 *   post:
 *     summary: Revoke admin privileges from a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Admin privileges revoked
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /api/v1/admin/period-logs:
 *   get:
 *     summary: List all period logs across all users (paginated)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by a specific user
 *     responses:
 *       200:
 *         description: List of period logs
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /api/v1/admin/period-logs/{id}:
 *   delete:
 *     summary: Delete any period log by ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Period log deleted
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
