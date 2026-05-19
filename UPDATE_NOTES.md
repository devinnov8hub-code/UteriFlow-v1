# UteriFlow v1 — Update notes

This update brings the new landing-page design fully into the v1 codebase,
adds **Newsletter** + **Waitlist** inboxes to the admin dashboard, and fixes
the forgot-password endpoint that was silently swallowing OTP emails.

---

## 1. Run the new SQL migration

Open the Supabase project's SQL editor and run:

```
Backend/supabase/migrations/v6_newsletter_and_waitlist.sql
```

That creates two tables:
- `newsletter_subscribers` — populated when a visitor submits the
  "Stay in the loop" form on the landing page.
- `waitlist_entries` — populated when a visitor submits the waitlist form.

Both tables have RLS enabled and only the backend's service-role client
can read/write them. The admin dashboard reads them through
`/api/v1/admin/newsletter` and `/api/v1/admin/waitlist`.

## 2. Backend environment

No new env vars. The existing `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, and SMTP variables are all that's needed.

If forgot-password emails were not arriving, the most common cause was the
old route silently skipping when `user_profiles.email` casing didn't match
the request. The new route:
- does a case-insensitive lookup with `.ilike(...)`,
- falls back to `auth.users` via the admin client when no profile row exists,
- and logs every step to the server console so failures are visible in your
  Vercel/Render logs (look for lines tagged `[forgot-password]`).

## 3. Frontend changes — landing

- Replaced the old `Home.tsx` / `About.tsx` / `Articles.tsx` / `TipDetail.tsx`
  with the redesigned landing from the standalone branch:
  `HeroSection`, `ProblemSection`, `SolutionSection`, `HowItWorksSection`,
  `ValuePropositionSection`, `NewsletterSection`, `WaitlistSection`,
  plus `ArticlesPage`, `ArticleDetailPage`, `ContactPage`, `PrivacyPage`,
  `TermsPage`.
- New brand system in `src/index.css`: deep purple `#690064` →
  magenta `#AB2EA5` with teal and pink accents, Plus Jakarta Sans typeface.
- **No Supabase on the frontend.** Everything goes through the Express
  backend at `/api/v1`:
  - `WaitlistSection` → `POST /api/v1/landing/waitlist`
  - `NewsletterSection` → `POST /api/v1/landing/newsletter`
  - `ArticlesPage`, `ArticleDetailPage` → `GET /api/v1/lifestyle`
- The `ArticlesPage` category filter chips ("All / PCOS / Cycle /
  Education / Hormones / Nutrition / Lifestyle") have been **removed**.
  The page now lists every published article chronologically.

## 4. Frontend changes — admin

- Two new pages: `Newsletter` (`/admin/newsletter`) and
  `Waitlist` (`/admin/waitlist`). Both support search, pagination,
  per-row delete with confirmation, and one-click CSV export.
- Sidebar gained two new items (Mail + UserPlus icons) and now loads
  the new brand `logo.svg` instead of the old PNG.
- `admin.css` recoloured to use the same purple ramp as the landing
  (`#690064` / `#AB2EA5` / `#D088CC`) so the two surfaces match.
- `AuthPage` updated to use the new logo (white-filtered on the purple
  side, full colour on the white card side).

## 5. Routes added on the backend

Public:
- `POST /api/v1/landing/newsletter` — body: `{ email }`
- `POST /api/v1/landing/waitlist` — body: `{ name, email }`

Admin (require `Authorization: Bearer <admin_token>`):
- `GET    /api/v1/admin/newsletter` — list subscribers (search, pagination)
- `DELETE /api/v1/admin/newsletter/:id`
- `GET    /api/v1/admin/waitlist` — list entries (search, pagination)
- `DELETE /api/v1/admin/waitlist/:id`

## 6. Forgot-password debugging

If a user reports that they still aren't receiving the code:

1. Tail your Vercel function logs while they hit `POST /auth/password/forgot`.
2. You should see one of these lines for their email:
   - `[forgot-password] Profile match in user_profiles for "..."`
   - `[forgot-password] Profile missing but auth.users match for "..."`
   - `[forgot-password] No account found for "..." — returning generic response`
3. If you see "Profile match" or "auth.users match" but no
   `[forgot-password] OTP sent to "..."`, then the OTP row insert or the
   email send failed — look immediately before that line for either
   `OTP insert FAILED` or `sendPasswordResetOTPEmail FAILED` with the
   underlying error message (usually an SMTP connection problem).
4. If you see "No account found" but the user *is* registered, the
   email they typed differs from what's stored. Have them double-check
   for spaces or typos. The lookup is already case-insensitive.
