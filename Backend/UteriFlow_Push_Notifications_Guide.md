# UteriFlow — Push Notifications (Firebase FCM) Guide

**Date:** 24 June 2026
**Audience:** Mobile developer + whoever deploys the backend
**What this covers:** the new endpoint to register a device's FCM token, how the backend sends push, and the one-time Firebase setup.

---

## TL;DR

- New endpoints: **`POST /api/v1/notifications/token`** (register device) and **`DELETE /api/v1/notifications/token`** (unregister on logout).
- The backend sends push through **Firebase Cloud Messaging** using a **service account from the same Firebase project the app uses**.
- Push is **fail-soft**: if Firebase env vars aren't set, the API runs normally and just skips sending — nothing breaks.
- **3 deploy steps**: run migration `v8_fcm_tokens.sql`, `npm install` (adds `firebase-admin`), set `FIREBASE_SERVICE_ACCOUNT_JSON`.

---

## 1. One-time Firebase setup (backend)

Use the **same Firebase project** as the mobile app.

1. Firebase console → **Project settings** → **Service accounts** → **Generate new private key**. This downloads a JSON file (`serviceAccount.json`).
2. Base64-encode it (single line, no wrapping):
   - Linux: `base64 -w0 serviceAccount.json`
   - macOS: `base64 -i serviceAccount.json`
3. Set the result as an environment variable on the backend (Vercel → Project → Settings → Environment Variables):

   ```
   FIREBASE_SERVICE_ACCOUNT_JSON = <the base64 string>
   ```

That's it. (You can paste the raw JSON instead of base64 if you prefer — the loader accepts both. Or set `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` individually. See `.env.example`.)

On boot you'll see `[firebase] Cloud Messaging initialised.` in the logs once a push is first attempted. If creds are missing you'll see `[firebase] No Firebase credentials configured — push notifications are disabled.` and the API keeps working.

---

## 2. Endpoints (mobile)

Both require the normal `Authorization: Bearer <accessToken>` header.

### Register / refresh a device token

`POST /api/v1/notifications/token`

```jsonc
// request body
{
  "token": "<the FCM registration token from the device>",
  "deviceType": "android"   // optional: "ios" | "android" | "web"
}
```

```jsonc
// 201 response
{
  "status": "success",
  "data": {
    "message": "Device registered for push notifications",
    "token": { "id": "uuid", "device_type": "android", "created_at": "…" }
  },
  "error": null
}
```

Behaviour:
- Idempotent. Calling it again with the same token just refreshes it (no duplicates — `token` is unique).
- If that token was previously registered to a different user (same physical device, new login), it's reassigned to the current user automatically.

### Unregister a device token

`DELETE /api/v1/notifications/token`

```jsonc
// request body
{ "token": "<the FCM registration token>" }
```

```jsonc
// 200 response
{ "status": "success", "data": { "message": "Device unregistered from push notifications" }, "error": null }
```

Only removes a token that belongs to the requesting user.

---

## 3. When the app should call these

- **After sign-in** (and after onboarding, whenever you have a valid session): get the FCM token from the Firebase SDK and `POST /notifications/token`.
- **On token refresh**: Firebase fires `onTokenRefresh` / `onNewToken` — call `POST /notifications/token` again with the new token.
- **On sign-out**: `DELETE /notifications/token` with the current token, **before** clearing the session, so the device stops receiving pushes for that account.
- Re-register opportunistically on app start if you're unsure (it's idempotent, so it's safe to call often).

> The backend automatically removes tokens that FCM reports as dead (app uninstalled, token expired) the next time it tries to send to them, so you don't have to clean those up.

---

## 4. How push is delivered

Today, push is triggered by the **admin broadcast** (admin dashboard → Notifications → send). When an admin sends a notification:

1. An in-app `notifications` row is created for each targeted user (this is what `GET /notifications` returns).
2. The backend then pushes to every registered device of those users.

So the in-app notification and the push are kept in sync. (Any future server-side notification triggers — e.g. cycle reminders — should call the same `sendPushToUsers(...)` helper in `src/utils/push.js` right after inserting the `notifications` row.)

### Payload the device receives

A standard FCM message:

```jsonc
{
  "notification": { "title": "<title>", "body": "<body>" },
  "data": {
    "type": "tip",         // or "system" — matches the in-app notification.type
    "kind": "broadcast"
  },
  // android: high priority; iOS: default sound
}
```

All `data` values are strings (FCM requirement). Use `data.type` / `data.kind` for any in-app routing you want to do when the user taps the notification. When the app receives a push it's a good moment to refresh the in-app list via `GET /api/v1/notifications`.

---

## 5. Data model

New table `user_fcm_tokens` (migration `v8_fcm_tokens.sql`):

| column | notes |
|--------|-------|
| `id` | uuid PK |
| `user_id` | FK → `auth.users(id)`, cascades on user delete |
| `token` | the FCM token, **unique** |
| `device_type` | `ios` \| `android` \| `web` (nullable) |
| `created_at`, `updated_at`, `last_used_at` | timestamps |

RLS lets a user manage only their own tokens; the backend writes with the service-role key so it can reassign/prune tokens.

---

## 6. Deployment checklist

1. **Run the migration** `supabase/migrations/v8_fcm_tokens.sql` in the Supabase SQL editor.
2. **Install deps**: `npm install` on the backend (adds `firebase-admin`). Redeploy.
3. **Set the env var** `FIREBASE_SERVICE_ACCOUNT_JSON` (see §1) on the backend host. Redeploy so it's picked up.
4. **Verify**: from the app, sign in and call `POST /notifications/token`; you should get a 201. Then send a test broadcast from the admin dashboard — the broadcast response includes a `push` summary, e.g. `"push": { "sent": 1, "failed": 0 }`. `"skipped": true` means Firebase env isn't configured yet.

If you skip step 3, everything still works except the actual push send (in-app notifications are unaffected).

---

## Quick reference

| Method | Endpoint | Body | Purpose |
|--------|----------|------|---------|
| `POST` | `/api/v1/notifications/token` | `{ token, deviceType? }` | Register / refresh device for push |
| `DELETE` | `/api/v1/notifications/token` | `{ token }` | Unregister device (on logout) |
| `POST` | `/api/v1/admin/notifications/broadcast` | `{ title, body, type, userIds? }` | (admin) create in-app notification + push; response now includes `push: { sent, failed }` |
