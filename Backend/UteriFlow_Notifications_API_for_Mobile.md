# UteriFlow — Notifications API (for Mobile)

Hey — backend side for push is done. It sends through the **same Firebase project you're using**, so all you need to do is call the endpoints below. You don't need any Firebase keys on your side beyond what you already have for getting the device token.

**Base URL:** `https://uteri-flow-v1.vercel.app/api/v1`
**Auth:** every endpoint here needs your normal header — `Authorization: Bearer <accessToken>`.
**Response envelope:** everything comes back as `{ "status", "data", "error" }`. Read your payload from `data`.

---

## 1. Register the device token

Send me the FCM token you get from Firebase on the device. That's what lets the backend push to it.

`POST /notifications/token`

```json
{
  "token": "<the FCM token from your device>",
  "deviceType": "android"
}
```
- `token` — required.
- `deviceType` — optional: `"ios"`, `"android"`, or `"web"`.

Returns `201`:
```json
{
  "status": "success",
  "data": {
    "message": "Device registered for push notifications",
    "token": { "id": "uuid", "device_type": "android", "created_at": "..." }
  },
  "error": null
}
```

It's safe to call repeatedly — same token just updates, no duplicates.

**Call it:**
- right after login (once you have a session),
- whenever Firebase gives you a new/refreshed token.

---

## 2. Unregister on logout

`DELETE /notifications/token`

**You don't have to pass anything.** Call it with an empty body and the backend removes the logged-out user's device token(s) by their user id — so even if the token changed since you registered it, the stale row is still cleaned up.

```json
// body — optional
{}
```

Returns `200`:
```json
{ "status": "success", "data": { "message": "Device(s) unregistered from push notifications", "removed": 1 }, "error": null }
```

If you ever want to remove just one specific device (and leave the user's other devices registered), pass that token:
```json
{ "token": "<the fcm token>" }
```
- No token → removes **all** of that user's tokens (normal logout). ✅ this is what you asked for.
- With a token → removes only that one device.

Call it on logout, **before** you clear the session/token. (You don't need to clean up expired tokens — the backend drops dead ones automatically too.)

---

## 3. The in-app notifications list (the bell)

These power the in-app notification screen and unread badge. Push and in-app stay in sync — when I send a notification it's saved here AND pushed to the device.

### List
`GET /notifications?limit=30&offset=0&unread_only=false`

```json
{
  "status": "success",
  "data": {
    "notifications": [
      { "id": "uuid", "type": "tip", "title": "...", "body": "...", "is_read": false, "created_at": "..." }
    ],
    "unreadCount": 3,
    "pagination": { "total": 12, "limit": 30, "offset": 0 }
  },
  "error": null
}
```
- `unread_only=true` to fetch only unread.
- For infinite scroll: stop when the returned array is empty or `offset + returned >= pagination.total`.
- Use `unreadCount` for the badge.

### Mark one read
`PATCH /notifications/{id}/read` → `{ "data": { "notification": { ... } } }`

### Mark all read
`PATCH /notifications/read-all` → `{ "data": { "message": "All notifications marked as read" } }`

### Delete one
`DELETE /notifications/{id}` → `{ "data": { "message": "Notification deleted" } }`

---

## 4. What the push payload looks like

When a push arrives on the device it's a standard FCM message:

```json
{
  "notification": { "title": "...", "body": "..." },
  "data": { "type": "tip", "kind": "broadcast" }
}
```
- `data.type` is `"tip"` or `"system"` — use it for any in-app routing on tap.
- All `data` values are strings (FCM rule).
- When a push lands, re-call `GET /notifications` so the list + unread badge refresh.

---

## TL;DR

| When | Call |
|------|------|
| After login / token refresh | `POST /notifications/token` with `{ token, deviceType }` |
| On logout (before clearing session) | `DELETE /notifications/token` — empty body, removes all the user's tokens |
| Open the bell screen | `GET /notifications` |
| Tap a notification | `PATCH /notifications/{id}/read` |
| "Mark all read" | `PATCH /notifications/read-all` |
| On push received | refresh `GET /notifications` |

That's everything. Ping me if any endpoint returns something you don't expect.
