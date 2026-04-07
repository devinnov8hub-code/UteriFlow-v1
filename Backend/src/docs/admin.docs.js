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

/**
 * @swagger
 * /api/v1/admin/users/{id}/ban:
 *   post:
 *     summary: Ban a user
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ban_type]
 *             properties:
 *               ban_type:
 *                 type: string
 *                 enum: [temporary, permanent]
 *                 example: temporary
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 example: Spamming the community
 *               days:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 365
 *                 description: Required when ban_type is temporary
 *                 example: 7
 *     responses:
 *       201:
 *         description: User banned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ban:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     user_id: { type: string, format: uuid }
 *                     ban_type: { type: string }
 *                     banned_until: { type: string, format: date-time, nullable: true }
 *                     reason: { type: string, nullable: true }
 *       404: { description: User not found }
 *       403: { description: Forbidden }
 *   delete:
 *     summary: Unban a user
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: User unbanned }
 *       403: { description: Forbidden }
 */

/**
 * @swagger
 * /api/v1/admin/notifications/broadcast:
 *   post:
 *     summary: Broadcast a notification to users
 *     description: >
 *       Sends a notification to all users or to a specific list of user IDs.
 *       Leave userIds empty to broadcast to every user on the platform.
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, body, type]
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Your period is coming up!"
 *               body:
 *                 type: string
 *                 example: "Based on your cycle history, your period is expected in 3 days."
 *               type:
 *                 type: string
 *                 enum: [tip, system]
 *                 example: tip
 *               userIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *                 description: Leave empty to broadcast to all users
 *     responses:
 *       200:
 *         description: Notification sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Notification sent to 142 user(s)" }
 *       403: { description: Forbidden }
 */

/**
 * @swagger
 * /api/v1/admin/comments/{id}/unflag:
 *   patch:
 *     summary: Remove the flag from a comment
 *     tags: [Admin Community]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Comment unflagged }
 *       404: { description: Comment not found }
 *       403: { description: Forbidden }
 */

/**
 * @swagger
 * /api/v1/admin/analytics:
 *   get:
 *     summary: Community analytics over a time period
 *     tags: [Admin Community]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, minimum: 1, maximum: 365, default: 30 }
 *         description: Number of days to look back
 *     responses:
 *       200:
 *         description: Community analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 period: { type: string, example: "30 days" }
 *                 stats:
 *                   type: object
 *                   properties:
 *                     postsPublished:  { type: integer }
 *                     comments:        { type: integer }
 *                     activeUsers:     { type: integer }
 *                     flaggedPosts:    { type: integer }
 *                     flaggedComments: { type: integer }
 *                     totalLikes:      { type: integer }
 *                 weeklyActivity:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       day:      { type: string, example: MON }
 *                       posts:    { type: integer }
 *                       comments: { type: integer }
 *                       likes:    { type: integer }
 *       403: { description: Forbidden }
 */
