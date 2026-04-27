# UteriFlow — Web App Deployment

A single frontend codebase that serves the marketing/waitlist landing page at `/` and the admin dashboard at `/admin`. There are no longer two separate frontend projects — both live inside `uteriflow/` and ship as one Vite build.

```
UteriFlow-v1/
├── Backend/                ← Node.js API (deployed at uteri-flow-v1.vercel.app)
└── uteriflow/              ← Combined frontend (deploys to uteriflow.com)
    ├── public/
    │   ├── uteriflow-logo.png        ← global brand logo (favicon, also at /uteriflow-logo.png)
    │   ├── vite.svg
    │   └── admin/                    ← admin static assets
    │       ├── logo.png              (white drop+wordmark, used on dark sidebar/hero)
    │       ├── Logo-purple.png       (purple drop+wordmark, used on light bg)
    │       └── dazzle-working-dashboard-auth-flow.png
    ├── src/
    │   ├── App.tsx                   ← single router: landing routes + /admin/* → AdminApp
    │   ├── main.tsx                  ← single React entry
    │   ├── components/
    │   │   ├── Header.tsx            ← landing top nav (uses global logo)
    │   │   └── Waitlist.tsx          ← Forminit waitlist form
    │   ├── pages/                    ← Home, About, Articles, TipDetail
    │   ├── lib/
    │   │   ├── api.ts                ← public axios for /lifestyle articles
    │   │   └── services/lifestyle.service.ts
    │   ├── types/
    │   ├── assets/                   ← landing images / logos imported via Vite
    │   └── admin/                    ← entire admin app, namespaced
    │       ├── AdminApp.jsx          ← admin's <Routes> mounted at /admin/*
    │       ├── api.js                ← admin axios client (auth + admin endpoints)
    │       ├── admin.css             ← admin global styles (CSS vars)
    │       ├── components/ (Sidebar, UI)
    │       ├── hooks/useAuth.jsx
    │       └── pages/ (Auth, Analytics, Users, Content, Notifications, Settings)
    ├── package.json                  ← combined deps (React 19 + admin's recharts/toast/date-fns)
    ├── vite.config.ts                ← Vite + Tailwind 4; /api proxy in dev
    ├── vercel.json                   ← single SPA rewrite rule
    └── tsconfig*.json
```

---

## What this deployment fixes

### Backend (`Backend/` folder — needs redeploy)

1. **`src/routes/period.js`** — fixed the insights endpoint. With only one period log, the endpoint used to return `cyclesTracked: 0`, all stats `null`, and `cycleHistory: []` even though the user had data. It now uses the user's onboarding `cycle_length_avg` as a fallback `averageCycleLength`, adds an in-progress `Current` entry to `cycleHistory` so the chart isn't empty, and returns sensible `cycleRange` values at every stage. **Response shape unchanged.**

2. **`src/routes/lifestyle.js`** — removed the `authenticateUser` middleware so the public landing page can fetch published articles without a login. Switched `req.supabase` → imported `supabase` since auth no longer runs. Only `is_published = true` rows are returned, so this is safe to expose.

3. **`src/docs/profile.docs.js`** — added swagger entries for `/profile/change-password` and `/profile/account` (DELETE).

### Delete-account endpoint

`DELETE /api/v1/profile/account` already existed at `Backend/src/routes/profile.js` lines 125–150 and matches the spec exactly: requires `{ password }` in body, re-verifies via `supabase.auth.signInWithPassword`, returns 400 on wrong password with message `"Incorrect password. Account deletion cancelled."`, calls `supabaseAdmin.auth.admin.deleteUser` on success which cascades all data. **No code change needed.**

### Frontend integration bugs that were silent killers — now fixed

| Where | What was wrong | Fix |
|---|---|---|
| `src/admin/api.js` | `getPosts`, `createPost`, `getPost`, `updatePost`, `deletePost` called `/admin/posts*` which 404s | Now `/admin/community/posts*` (where backend mounts them) |
| `src/admin/api.js` | `getComments`, `deleteComment`, `flagComment`, `unflagComment` called `/admin/comments*` which 404s | Now `/admin/community/comments*` |
| `src/admin/api.js` | `getAnalytics` called `/admin/analytics` which 404s | Now `/admin/community/analytics` |
| `src/admin/api.js` | 401 redirected to `/login` (where landing visitors might also bounce) | Now only redirects when `pathname.startsWith('/admin')` AND `pathname !== '/admin/login'` |
| `src/lib/services/lifestyle.service.ts` | Did `return response.data`, returning the entire `{status, data, error}` envelope to pages that called `.map()` on it | Now returns `response.data?.data?.articles ?? []` for the list and `response.data?.data?.article ?? null` for the detail |
| `src/lib/api.ts` | Had a dead `formInitApi` axios instance that used `FORM_INIT_URL` (wrong prefix — Vite needs `VITE_*`) | Removed; Waitlist uses Forminit SDK directly with `VITE_FORM_ID` |

`ContentPage` (post management) and `AnalyticsPage` (community analytics) were essentially non-functional in the previous deploy. They're now wired to the correct backend paths.

### Logo unification

Per your request, the admin's brand logo is now used globally:

| Location | Logo | Reason |
|---|---|---|
| Browser favicon | `/uteriflow-logo.png` | Same purple drop+wordmark image, served from public root |
| Landing Header (top nav, on translucent backdrop) | `/uteriflow-logo.png` | Replaces the abstract `f` SVG + duplicate `<h1>UteriFlow</h1>` text — the wordmark is in the image |
| Waitlist hero (purple gradient bg) | `/admin/logo.png` | White-on-purple variant for contrast |
| Admin sidebar | `/admin/logo.png` | White on purple sidebar |
| Admin AuthPage hero | `/admin/logo.png`, `/admin/Logo-purple.png`, `/admin/dazzle-working-dashboard-auth-flow.png` | Same images the dev shipped, now served from `/admin/*` since they live in `public/admin/` |

The original abstract-`f` logo (`src/assets/Uteri Flow logo.svg`) is no longer used. The file is still in the assets folder if you ever want to revert.

### Landing design preservation

Every page (Home, About, Articles, TipDetail), every component (Header, Waitlist), every image (community, lifestyle, mockuper, ovulation), Tailwind 4, React 19, react-router 7, Vite 7 — all kept exactly as the dev shipped them. The build was verified end-to-end producing a working `dist/` with both halves bundled.

---

## Local development

You need three things running to test the full app:

```bash
# Terminal 1 — Backend
cd Backend
npm install
npm run dev          # → http://localhost:3000

# Terminal 2 — Frontend (landing + admin combined)
cd uteriflow
npm install
npm run dev          # → http://localhost:5173, proxies /api to :3000
```

Then visit:

- `http://localhost:5173/` — landing waitlist hero
- `http://localhost:5173/about` — about page
- `http://localhost:5173/articles` — wellness articles list (now actually loads — backend `/lifestyle` is public)
- `http://localhost:5173/articles/<id>` — article detail
- `http://localhost:5173/admin` — redirects to `/admin/login` or `/admin/analytics`
- `http://localhost:5173/admin/login` — admin login

The Vite dev proxy forwards `/api/*` to the backend, so no CORS configuration needed locally.

---

## Production deployment

### Step 1 — Push to Git

```bash
cd UteriFlow-v1
git init && git add . && git commit -m "Combined web app: landing + admin"
git remote add origin <your-repo-url>
git push -u origin main
```

### Step 2 — Backend redeploy

Backend is already at `uteri-flow-v1.vercel.app`. Just push the updated code so the auto-deploy picks up the insights fix, the public lifestyle endpoint, and the swagger updates.

While you're in the backend Vercel project, update CORS so the new domain is allowed:

| Env var | Value |
|---|---|
| `CORS_ORIGIN` | `https://uteriflow.com,https://www.uteriflow.com` |

Then redeploy (env-var changes don't auto-redeploy on Vercel).

### Step 3 — Create new Vercel project for the frontend

1. [vercel.com/new](https://vercel.com/new) → import the same Git repo
2. **Root Directory: `uteriflow`** ← critical, NOT the repo root
3. Framework preset: auto-detects as **Vite**
4. Leave build/install/output commands as defaults — `vercel.json` handles the rest

### Step 4 — Set env vars

Vercel project → Settings → Environment Variables:

| Name | Value | Scope |
|---|---|---|
| `VITE_API_URL` | `https://uteri-flow-v1.vercel.app/api/v1` | Production, Preview, Development |
| `VITE_FORM_ID` | `<your Forminit form ID>` | Production, Preview, Development |

Trigger a redeploy after adding env vars (env-var changes don't auto-rebuild).

### Step 5 — Add custom domain

Vercel project → Settings → Domains:
- Add `uteriflow.com`
- Add `www.uteriflow.com`

Vercel will show you the DNS records you need.

### Step 6 — GoDaddy DNS

GoDaddy → My Products → `uteriflow.com` → DNS:

Delete any existing A/CNAME records pointing elsewhere, then add:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | @ | `76.76.21.21` | 1 hour |
| CNAME | www | `cname.vercel-dns.com` | 1 hour |

Use whatever Vercel's dashboard tells you in case those values change. DNS propagation: usually 5–30 minutes on GoDaddy. Vercel auto-issues a Let's Encrypt SSL cert once DNS resolves.

### Step 7 — Verify

After deploy:

| URL | Expected |
|---|---|
| `https://uteriflow.com/` | Landing hero, waitlist form works (Forminit) |
| `https://uteriflow.com/about` | About page loads on direct visit (tests SPA rewrite) |
| `https://uteriflow.com/articles` | Articles list populated from backend |
| `https://uteriflow.com/articles/<uuid>` | Article detail works |
| `https://uteriflow.com/admin` | Redirects to login or analytics |
| `https://uteriflow.com/admin/login` | Admin login screen |
| `https://uteriflow.com/admin/analytics` | Loads after login (refresh works = SPA rewrite working) |
| `https://uteriflow.com/admin/content` | Posts list loads (was 404'ing before) |
| `https://uteriflow.com/admin/users` | Users list loads |

**Insights fix on a real account:** with one period log, GET `/api/v1/period/insights` should return:
- `averageCycleLength` populated from the onboarding estimate
- `cycleHistory: [{ label: 'Current', days: <N>, inProgress: true }]`
- `cycleRange: '~28 days'` (with tilde, indicating estimate not measured)

**Delete account:** `DELETE /api/v1/profile/account` with `Authorization: Bearer <token>` and body `{ "password": "<current password>" }`. Wrong password → 400 with `"Incorrect password. Account deletion cancelled."` Correct → 200 and account is gone.

---

## Common issues

**Articles page is empty in production.** Check Network tab — `/api/v1/lifestyle` should return 200 with an `articles` array. If 401, backend wasn't redeployed with the lifestyle-public change. If 200 but blank, hard-refresh — old cached JS may still be running the unfixed `lifestyle.service.ts`.

**Admin can log in but Analytics or Content pages are blank.** Check Network — if you see `/api/v1/admin/posts` (404) instead of `/api/v1/admin/community/posts`, the frontend wasn't redeployed.

**CORS errors on the admin.** Backend's `CORS_ORIGIN` doesn't include `https://uteriflow.com`. Update and redeploy backend.

**`/admin/login` works but a refresh on `/admin/users` shows "Not Found".** vercel.json rewrites aren't applied. Make sure `vercel.json` is at `uteriflow/vercel.json` and Vercel "Root Directory" is `uteriflow`.

**Landing logo doesn't load.** Check `/uteriflow-logo.png` returns 200. If 404, the file in `public/` wasn't included in the build — verify `dist/uteriflow-logo.png` exists after `npm run build`.

**Local admin can't reach backend.** Confirm backend is running on port 3000. Vite's dev proxy in `vite.config.ts` forwards `/api/*` to `localhost:3000`.
