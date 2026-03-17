# UteriFlow Admin — React Web App

Admin dashboard for the UteriFlow platform. Built with **React 18 + Vite + React Router**.

## Stack
- React 18 + Vite 5
- React Router 6
- Recharts (analytics charts)
- Lucide React (icons)
- Axios (API calls)
- React Hot Toast (notifications)
- date-fns (time formatting)

## Setup

```bash
npm install
cp .env.example .env      # set VITE_API_URL=http://localhost:3000/api/v1
npm run dev               # → http://localhost:5173
npm run build             # production build
```

## Image assets (IMPORTANT)
Place these two files in the `public/` folder — they're already in your project:

| File | Used in |
|---|---|
| `public/logo.png` | Auth left panel + sidebar brand |
| `public/dazzle-working-dashboard-auth-flow.png` | Auth left panel illustration |

Both have graceful fallbacks if files are missing.

## Pages

| Route | Page |
|---|---|
| `/login` | Auth — Login / Signup+OTP / Forgot / Reset |
| `/analytics` | Dashboard with stats + live charts |
| `/content` | Posts, comments, compose, bans |
| `/settings` | Account config |

## Mobile responsive
- < 768px: sidebar collapses into hamburger top bar + slide-out drawer
- < 900px: comments panel becomes a bottom sheet (tap "💬 Comments")
- < 640px: stats/settings grids go single column

## Backend endpoints used

| Feature | Endpoint |
|---|---|
| Login | `POST /api/v1/auth/login` |
| Signup OTP | `POST /api/v1/auth/email/send-otp` |
| Verify OTP | `POST /api/v1/auth/email/verify` |
| Create account | `POST /api/v1/auth/password/create` |
| Forgot password | `POST /api/v1/auth/password/forgot` |
| Verify reset code | `POST /api/v1/auth/password/verify-code` |
| Reset password | `POST /api/v1/auth/password/reset` |
| Analytics stats | `GET /api/v1/admin/analytics` |
| Platform stats | `GET /api/v1/admin/stats` |
| Posts list | `GET /api/v1/admin/posts` |
| Create post | `POST /api/v1/admin/posts` |
| Delete post | `DELETE /api/v1/admin/posts/:id` |
| Post comments | `GET /api/v1/admin/posts/:id/comments` |
| Delete comment | `DELETE /api/v1/admin/comments/:id` |
| Flag comment | `PATCH /api/v1/admin/comments/:id/flag` |
| Ban user | `POST /api/v1/admin/users/:id/ban` |

## Grant admin access
```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"is_admin": true}'
WHERE email = 'admin@yourdomain.com';
```

## Add admin CORS origin to backend .env
```
CORS_ORIGIN=http://localhost:3000,http://localhost:8081,http://localhost:5173
```
