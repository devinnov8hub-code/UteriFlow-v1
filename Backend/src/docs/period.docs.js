/**
 * @swagger
 * /api/v1/period/first-log:
 *   post:
 *     summary: Log the user's first period cycle
 *     description: Records the very first period log. Only one first-log is allowed per account.
 *     tags: [Period Tracking]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [startDate]
 *             properties:
 *               startDate: { type: string, format: date, example: "2026-03-06" }
 *               notes: { type: string, example: "Mild cramps" }
 *     responses:
 *       201:
 *         description: First period logged
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 periodLog: { $ref: '#/components/schemas/PeriodLog' }
 *       400: { description: Already logged or invalid input }
 *       401: { description: Unauthorized }
 */

/**
 * @swagger
 * /api/v1/period/log:
 *   post:
 *     summary: Log a new period cycle
 *     tags: [Period Tracking]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [startDate]
 *             properties:
 *               startDate: { type: string, format: date, example: "2026-04-01" }
 *               endDate: { type: string, format: date, nullable: true, example: "2026-04-06" }
 *               notes: { type: string, nullable: true }
 *     responses:
 *       201:
 *         description: Period logged and next cycle prediction refreshed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 periodLog: { $ref: '#/components/schemas/PeriodLog' }
 *       401: { description: Unauthorized }
 */

/**
 * @swagger
 * /api/v1/period/logs:
 *   get:
 *     summary: List the user's period logs
 *     tags: [Period Tracking]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0, minimum: 0 }
 *     responses:
 *       200:
 *         description: List of period logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 periodLogs:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/PeriodLog' }
 *                 total: { type: integer }
 *       401: { description: Unauthorized }
 */

/**
 * @swagger
 * /api/v1/period/log/{id}:
 *   put:
 *     summary: Update a period log
 *     tags: [Period Tracking]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startDate: { type: string, format: date }
 *               endDate: { type: string, format: date, nullable: true }
 *               notes: { type: string, nullable: true }
 *     responses:
 *       200: { description: Period log updated }
 *       404: { description: Not found }
 *       401: { description: Unauthorized }
 *   delete:
 *     summary: Delete a period log
 *     tags: [Period Tracking]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Period log deleted }
 *       404: { description: Not found }
 *       401: { description: Unauthorized }
 */

/**
 * @swagger
 * /api/v1/period/symptoms:
 *   post:
 *     summary: Log symptoms for a day
 *     description: >
 *       Log physical symptoms, flow level, mood, and pain level for a given date.
 *       optionally link to a specific period log via logId.
 *     tags: [Period Tracking]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [symptoms]
 *             properties:
 *               loggedDate: { type: string, format: date, example: "2026-04-03" }
 *               logId: { type: string, format: uuid, nullable: true }
 *               symptoms:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [cramps, bloating, headache, backache, nausea, fatigue, breast_tenderness, acne, mood_swings, spotting, insomnia, food_cravings, hot_flashes, other]
 *                 example: [cramps, fatigue]
 *               flowLevel:
 *                 type: string
 *                 enum: [spotting, light, medium, heavy, very_heavy]
 *                 nullable: true
 *                 example: medium
 *               mood:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [happy, sad, anxious, irritable, calm, energetic, depressed, emotional]
 *                 example: [anxious, irritable]
 *               painLevel:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *                 nullable: true
 *                 example: 6
 *               notes: { type: string, nullable: true }
 *     responses:
 *       201:
 *         description: Symptoms logged
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 symptomLog: { $ref: '#/components/schemas/SymptomLog' }
 *       401: { description: Unauthorized }
 *   get:
 *     summary: List symptom logs
 *     tags: [Period Tracking]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 30 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: List of symptom logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 symptoms:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/SymptomLog' }
 *       401: { description: Unauthorized }
 */

/**
 * @swagger
 * /api/v1/period/prediction:
 *   get:
 *     summary: Get the current cycle prediction
 *     description: >
 *       Returns the predicted next period start/end, ovulation date, and fertile window.
 *       Predictions are automatically recomputed whenever a period log is added or updated.
 *     tags: [Period Tracking]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Current cycle prediction
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 prediction: { $ref: '#/components/schemas/CyclePrediction' }
 *       401: { description: Unauthorized }
 */

/**
 * @swagger
 * /api/v1/period/summary:
 *   get:
 *     summary: Get dashboard / home screen summary
 *     description: >
 *       Returns all data needed for the home screen: current cycle phase,
 *       days until next period, personalised tip based on personality_type,
 *       today's symptoms, and the latest prediction. This is the primary
 *       endpoint for the app home/dashboard screen.
 *     tags: [Period Tracking]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Dashboard summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     userName: { type: string }
 *                     cyclePhase:
 *                       type: string
 *                       enum: [menstrual, follicular, fertile, pms, unknown]
 *                     daysUntilPeriod: { type: integer, nullable: true }
 *                     prediction: { $ref: '#/components/schemas/CyclePrediction' }
 *                     lastPeriod: { $ref: '#/components/schemas/PeriodLog' }
 *                     todaySymptoms: { $ref: '#/components/schemas/SymptomLog' }
 *                     personalizedTip: { type: string }
 *                     profile:
 *                       type: object
 *                       properties:
 *                         personalityType: { type: string }
 *                         motivationStyle: { type: string }
 *                         healthFocus: { type: array, items: { type: string } }
 *                         hormonalStatus: { type: string }
 *                         cycleLengthAvg: { type: integer }
 *                         periodLengthAvg: { type: integer }
 *       401: { description: Unauthorized }
 */
