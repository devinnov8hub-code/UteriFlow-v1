# UteriFlow API Backend

Node.js/Express backend for UteriFlow — authentication, user onboarding, and period tracking, powered by Supabase.

## Tech Stack

- **Node.js** (v18+, ESM)
- **Express.js** — HTTP framework
- **Supabase** — PostgreSQL database + Auth + email delivery
- **express-validator** — request validation
- **helmet** — HTTP security headers
- **express-rate-limit** — brute-force protection
- **Swagger/OpenAPI 3.0** — interactive API docs

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Then fill in your values. At minimum you need:
```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run the Supabase migration
In your Supabase dashboard → SQL Editor, run the contents of `supabase/migrations/schema.sql`.

### 4. Start the server
```bash
npm run dev     # development (file watching)
npm start       # production
```

Open `http://localhost:3000/api-docs` to test all endpoints via Swagger UI.

---

## Supabase Email / OTP Setup

For OTP emails to actually arrive in the user's inbox, you need to configure email in Supabase. Choose one option:

### Option A — Custom SMTP (recommended)
1. Supabase Dashboard → **Auth → SMTP Settings**
2. Enable custom SMTP and enter credentials from Resend, SendGrid, Mailgun, Gmail, etc.
3. OTP emails will be sent automatically when the API calls `signInWithOtp()`.

### Option B — Disable email confirmation (development only)
1. Supabase Dashboard → **Auth → Email → Confirm email** → Toggle **OFF**
2. No email is sent. Users can register freely. Good for local dev/testing.

### Option C — Service role key (production recommended)
Add `SUPABASE_SERVICE_ROLE_KEY` to `.env`. The server will call `admin.createUser({ email_confirm: true })`, which creates a confirmed account with no confirmation email required.

---

## Project Structure

```
src/
├── config/
│   ├── supabase.js          # Supabase anon + admin clients
│   └── swagger.js           # OpenAPI config + shared schemas
├── docs/
│   ├── auth.docs.js         # Auth API documentation
│   ├── onboarding.docs.js   # Onboarding API documentation
│   └── period.docs.js       # Period tracking API documentation
├── errors/
│   └── index.js             # AppError, ValidationError, NotFoundError, etc.
├── middleware/
│   ├── auth.js              # JWT authentication middleware
│   └── validate.js          # express-validator result handler
├── routes/
│   ├── auth.js              # Auth routes
│   ├── onboarding.js        # Onboarding routes
│   └── period.js            # Period tracking routes
├── utils/
│   └── otp.js               # Cryptographically secure OTP utilities
├── validators/
│   └── index.js             # Centralized request validators
└── server.js                # App entry point
```

---

## Authentication Flow

```
1. POST /api/v1/auth/email/check          → check if email is registered
2. POST /api/v1/auth/email/send-otp       → send 6-digit OTP via email (10 min expiry)
3. POST /api/v1/auth/email/verify         → verify OTP (max 5 attempts)
4. POST /api/v1/auth/password/create      → create account → receive accessToken + refreshToken
```

**Returning user login:**
```
POST /api/v1/auth/login                   → email + password → accessToken + refreshToken
```

**Token management:**
```
POST /api/v1/auth/token/refresh           → refreshToken → new accessToken
POST /api/v1/auth/logout                  → invalidate session
POST /api/v1/auth/password/forgot         → send reset email
```

---

## Onboarding Flow (Bearer token required)

```
POST /api/v1/onboarding/name
POST /api/v1/onboarding/age
POST /api/v1/onboarding/hormonal-status
POST /api/v1/onboarding/period-regularity
POST /api/v1/onboarding/health-focus
POST /api/v1/onboarding/complete
GET  /api/v1/onboarding/profile
```

---

## Period Tracking (Bearer token required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/period/first-log` | Log very first period (once only) |
| POST | `/api/v1/period/log` | Log a period cycle |
| GET  | `/api/v1/period/logs` | Paginated logs |
| PUT  | `/api/v1/period/log/:id` | Update a log |
| DELETE | `/api/v1/period/log/:id` | Delete a log |

---

## Security

- `helmet` — sets secure HTTP response headers
- Rate limiting — 200 req/15 min globally; 20 req/15 min on auth routes
- OTP uses `crypto.randomInt` — cryptographically secure
- OTP expiry — 10 minutes, max 5 attempts before lockout
- Supabase RLS — users can only access their own data
- Centralized error handler — no stack traces in production responses
- Password reset uses email enumeration protection (same response regardless of email existence)
- Service role key never returned to client; session tokens scoped to `accessToken`, `refreshToken`, `expiresAt` only

---

## Using Swagger UI to Test

1. Start the server: `npm run dev`
2. Open: `http://localhost:3000/api-docs`
3. Run `POST /auth/email/send-otp` with your email
4. Check your inbox for the OTP code
5. Run `POST /auth/email/verify` with the code
6. Run `POST /auth/password/create` to register
7. Copy the `accessToken` from the response
8. Click **Authorize** (top right of Swagger UI) and paste: `Bearer <your-token>`
9. All protected endpoints are now accessible
