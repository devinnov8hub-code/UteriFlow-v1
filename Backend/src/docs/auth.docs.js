/**
 * @swagger
 * /auth/email/check:
 *   post:
 *     summary: Check if an email is registered
 *     description: Returns whether the email exists and which flow to follow — login or register.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Email check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists:
 *                   type: boolean
 *                 flow:
 *                   type: string
 *                   enum: [login, register]
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */

/**
 * @swagger
 * /auth/email/send-otp:
 *   post:
 *     summary: Send OTP to email
 *     description: >
 *       Generates a 6-digit OTP, stores it with a 10-minute expiry, and sends it
 *       to the user's email via Resend SMTP.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 verificationId:
 *                   type: string
 *                   format: uuid
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /auth/email/verify:
 *   post:
 *     summary: Verify the OTP code
 *     description: >
 *       Validates the 6-digit OTP for registration. Max 5 attempts before lockout.
 *       Returns remaining attempts on failure.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               code:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 example: "483920"
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 verified:
 *                   type: boolean
 *                 email:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */

/**
 * @swagger
 * /auth/email/resend:
 *   post:
 *     summary: Resend OTP verification code
 *     description: Invalidates previous unverified OTPs and sends a fresh 6-digit code.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 verificationId:
 *                   type: string
 *                   format: uuid
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /auth/password/create:
 *   post:
 *     summary: Create account with password
 *     description: >
 *       Registers a new user after email OTP verification. Sends a welcome email on success.
 *       Password must be at least 8 characters with at least one number and one letter.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: SecurePass1
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/AuthUser'
 *                 session:
 *                   $ref: '#/components/schemas/Session'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         $ref: '#/components/responses/ConflictError'
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in with email and password
 *     description: Authenticates a registered user and returns a JWT access and refresh token pair.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: SecurePass1
 *     responses:
 *       200:
 *         description: Logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/AuthUser'
 *                 session:
 *                   $ref: '#/components/schemas/Session'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */

/**
 * @swagger
 * /auth/token/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Uses a valid refresh token to issue a new access token and refresh token pair.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: your-refresh-token-here
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 session:
 *                   $ref: '#/components/schemas/Session'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out current user
 *     description: Invalidates the current session. Pass the Bearer token in the Authorization header.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /auth/password/forgot:
 *   post:
 *     summary: "Send 6-digit reset code to email"
 *     description: >
 *       Sends a 6-digit password reset code to the user's email via Resend SMTP.
 *       Always returns the same response whether or not the email exists (prevents enumeration).
 *       The code expires in 10 minutes.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Reset code sent (if account exists)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "If an account with this email exists, a 6-digit reset code has been sent to your email."
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */

/**
 * @swagger
 * /auth/password/verify-code:
 *   post:
 *     summary: "Verify the 6-digit reset code"
 *     description: >
 *       Verifies the 6-digit code sent to the user's email. Max 5 attempts before lockout.
 *       On success, returns a resetToken that must be passed to /auth/password/reset.
 *       The resetToken is valid for the remaining time within the original 10-minute window.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               code:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 example: "739201"
 *     responses:
 *       200:
 *         description: Code verified — proceed to set new password
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Code verified. You may now set a new password."
 *                 resetToken:
 *                   type: string
 *                   format: uuid
 *                   description: Pass this token to POST /auth/password/reset
 *                 email:
 *                   type: string
 *                   format: email
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /auth/password/reset:
 *   post:
 *     summary: "Set new password"
 *     description: >
 *       Sets a new password using the resetToken obtained from /auth/password/verify-code.
 *       Requires password and confirmPassword to match.
 *       Sends a security alert email to the user on success.
 *       The resetToken is burned after use and cannot be reused.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [resetToken, password, confirmPassword]
 *             properties:
 *               resetToken:
 *                 type: string
 *                 format: uuid
 *                 description: The token returned by POST /auth/password/verify-code
 *                 example: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: New password (min 8 chars, must include a letter and a number)
 *                 example: NewSecurePass1
 *               confirmPassword:
 *                 type: string
 *                 description: Must match password exactly
 *                 example: NewSecurePass1
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password reset successfully. You can now log in with your new password."
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
