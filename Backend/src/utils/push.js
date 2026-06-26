// Push notification helper (Firebase Cloud Messaging).
//
// All functions are fail-soft: if push isn't configured they return
// { sent: 0, skipped: true } and never throw. Callers should treat push as
// best-effort and not let it block the request (always create the in-app
// `notifications` row first, then push).

import { getMessaging } from '../config/firebase.js';

// FCM data values must all be strings.
function stringifyData(data = {}) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === null || v === undefined) continue;
    out[k] = typeof v === 'string' ? v : String(v);
  }
  return out;
}

// Look up a set of users' device tokens → [{ token, id }]
async function getTokens(db, userIds) {
  if (!userIds || userIds.length === 0) return [];
  const { data, error } = await db
    .from('user_fcm_tokens')
    .select('id, token')
    .in('user_id', userIds);
  if (error) {
    console.warn('[push] failed to load tokens:', error.message);
    return [];
  }
  return data ?? [];
}

// Remove tokens FCM reports as permanently invalid (uninstalled app, etc.).
async function pruneTokens(db, tokenStrings) {
  if (!tokenStrings.length) return;
  const { error } = await db.from('user_fcm_tokens').delete().in('token', tokenStrings);
  if (error) console.warn('[push] failed to prune dead tokens:', error.message);
}

/**
 * Send a push to one or more users (all of their registered devices).
 * @param db        a Supabase client with write access (ideally service-role)
 * @param userIds   array of user ids (or a single id string)
 * @param payload   { title, body, data? }
 * @returns { sent, failed, skipped? }
 */
export async function sendPushToUsers(db, userIds, { title, body, data = {} } = {}) {
  const messaging = await getMessaging();
  if (!messaging) return { sent: 0, failed: 0, skipped: true };

  const ids = Array.isArray(userIds) ? userIds : [userIds];
  const rows = await getTokens(db, ids);
  if (rows.length === 0) return { sent: 0, failed: 0 };

  const tokens = rows.map(r => r.token);
  const dataPayload = stringifyData(data);

  let sent = 0, failed = 0;
  const dead = [];

  // sendEachForMulticast accepts up to 500 tokens per call.
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    try {
      const resp = await messaging.sendEachForMulticast({
        tokens: batch,
        notification: { title, body },
        data: dataPayload,
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      });
      sent += resp.successCount;
      failed += resp.failureCount;
      resp.responses.forEach((r, idx) => {
        const code = r.error?.code;
        if (code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/invalid-argument') {
          dead.push(batch[idx]);
        }
      });
    } catch (err) {
      failed += batch.length;
      console.warn('[push] send batch failed:', err.message);
    }
  }

  if (dead.length) await pruneTokens(db, dead);

  return { sent, failed };
}

// Convenience single-user wrapper.
export async function sendPushToUser(db, userId, payload) {
  return sendPushToUsers(db, [userId], payload);
}
