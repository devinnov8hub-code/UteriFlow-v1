/**
 * @swagger
 * /api/v1/profile:
 *   get:
 *     summary: Get current user's full profile
 *     description: Returns profile with stats (post count, bookmark count).
 *     tags: [Profile]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: User profile with stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 profile:
 *                   allOf:
 *                     - $ref: '#/components/schemas/UserProfile'
 *                     - type: object
 *                       properties:
 *                         stats:
 *                           type: object
 *                           properties:
 *                             postsCount: { type: integer }
 *                             bookmarksCount: { type: integer }
 *       401: { description: Unauthorized }
 *   patch:
 *     summary: Update own profile
 *     tags: [Profile]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName: { type: string, maxLength: 50 }
 *               bio: { type: string, maxLength: 500, nullable: true }
 *               avatarUrl: { type: string, format: uri, nullable: true }
 *               cycleLengthAvg: { type: integer, minimum: 14, maximum: 60, example: 28 }
 *               periodLengthAvg: { type: integer, minimum: 1, maximum: 14, example: 5 }
 *               notificationPref: { type: string, enum: [all, important_only, none] }
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 profile: { $ref: '#/components/schemas/UserProfile' }
 *       401: { description: Unauthorized }
 */

/**
 * @swagger
 * /api/v1/profile/{id}:
 *   get:
 *     summary: Get a public user profile
 *     description: Returns limited public info for another user. Used for community post author pages.
 *     tags: [Profile]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Public profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 profile:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     display_name: { type: string }
 *                     avatar_url: { type: string, nullable: true }
 *                     bio: { type: string, nullable: true }
 *                     postsCount: { type: integer }
 *       404: { description: User not found }
 *       401: { description: Unauthorized }
 */
