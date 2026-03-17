/**
 * @swagger
 * /period/first-log:
 *   post:
 *     summary: Log the user's first period cycle
 *     description: >
 *       Records the very first period log for a user. Only one first log is allowed per account.
 *       Requires authentication.
 *     tags: [Period Tracking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [startDate]
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-03-06"
 *               notes:
 *                 type: string
 *                 example: "Mild cramps"
 *     responses:
 *       201:
 *         description: First period logged successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 periodLog:
 *                   $ref: '#/components/schemas/PeriodLog'
 *       400:
 *         description: First period already logged or invalid input
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
 * /period/log:
 *   post:
 *     summary: Log a period cycle
 *     description: Records a new period cycle with optional end date and notes. Requires authentication.
 *     tags: [Period Tracking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [startDate]
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-03-06"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-03-10"
 *               notes:
 *                 type: string
 *                 example: "Heavy flow on day 2"
 *     responses:
 *       201:
 *         description: Period logged successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 periodLog:
 *                   $ref: '#/components/schemas/PeriodLog'
 *       400:
 *         description: Invalid input
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
 * /period/logs:
 *   get:
 *     summary: Get all period logs for the authenticated user
 *     description: Returns a paginated list of all period logs ordered by start date descending.
 *     tags: [Period Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Number of records to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *         description: Number of records to skip
 *     responses:
 *       200:
 *         description: Period logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 periodLogs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PeriodLog'
 *                 total:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /period/log/{id}:
 *   put:
 *     summary: Update a period log
 *     description: Updates any field of an existing period log. Only the owner can update their logs.
 *     tags: [Period Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Period log ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Period log updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 periodLog:
 *                   $ref: '#/components/schemas/PeriodLog'
 *       400:
 *         description: Invalid input
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
 *       404:
 *         description: Period log not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /period/log/{id}:
 *   delete:
 *     summary: Delete a period log
 *     description: Permanently deletes a period log. Only the owner can delete their logs.
 *     tags: [Period Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Period log ID
 *     responses:
 *       200:
 *         description: Period log deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Period log not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
