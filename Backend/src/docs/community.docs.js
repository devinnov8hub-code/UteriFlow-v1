/**
 * @swagger
 * /api/v1/community/posts:
 *   get:
 *     summary: List published posts (user-facing)
 *     tags: [Community]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [community, lifestyle_tips, discord] }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: List of posts with liked/bookmarked flags
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Post' }
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401: { description: Unauthorized }
 */

/**
 * @swagger
 * /api/v1/community/posts/{id}:
 *   get:
 *     summary: Get a single post
 *     tags: [Community]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Post with comment count and like/bookmark flags
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 post: { $ref: '#/components/schemas/Post' }
 *       404: { description: Not found }
 *       401: { description: Unauthorized }
 */

/**
 * @swagger
 * /api/v1/community/posts/{id}/like:
 *   post:
 *     summary: Toggle like on a post
 *     description: If already liked, removes the like (unlike). Returns liked true/false.
 *     tags: [Community]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Like toggled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 liked: { type: boolean }
 *       401: { description: Unauthorized }
 */

/**
 * @swagger
 * /api/v1/community/posts/{id}/bookmark:
 *   post:
 *     summary: Toggle bookmark on a post
 *     tags: [Community]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Bookmark toggled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bookmarked: { type: boolean }
 *       401: { description: Unauthorized }
 */

/**
 * @swagger
 * /api/v1/community/bookmarks:
 *   get:
 *     summary: List the current user's bookmarked posts
 *     tags: [Community]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Bookmarked posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Post' }
 *       401: { description: Unauthorized }
 */

/**
 * @swagger
 * /api/v1/community/posts/{id}/comments:
 *   get:
 *     summary: List top-level comments on a post
 *     tags: [Community]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 30 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: List of comments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comments:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Comment' }
 *       401: { description: Unauthorized }
 *   post:
 *     summary: Post a comment (or reply) on a post
 *     tags: [Community]
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
 *             required: [content]
 *             properties:
 *               content: { type: string, maxLength: 2000, example: "This really helped me!" }
 *               parentId: { type: string, format: uuid, nullable: true, description: "Set to reply to another comment" }
 *     responses:
 *       201:
 *         description: Comment created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comment: { $ref: '#/components/schemas/Comment' }
 *       401: { description: Unauthorized }
 */

/**
 * @swagger
 * /api/v1/community/comments/{id}/replies:
 *   get:
 *     summary: Get replies to a comment
 *     tags: [Community]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Replies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 replies:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Comment' }
 *       401: { description: Unauthorized }
 */

/**
 * @swagger
 * /api/v1/community/comments/{id}/like:
 *   post:
 *     summary: Toggle like on a comment
 *     tags: [Community]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Like toggled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 liked: { type: boolean }
 *       401: { description: Unauthorized }
 */

/**
 * @swagger
 * /api/v1/community/posts/{id}/report:
 *   post:
 *     summary: Report a post for review
 *     tags: [Community]
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
 *             required: [reason]
 *             properties:
 *               reason: { type: string, maxLength: 500, example: "Inappropriate content" }
 *     responses:
 *       200: { description: Post reported and flagged for admin review }
 *       401: { description: Unauthorized }
 */
