// Firebase Admin (Cloud Messaging) — lazy, fail-soft initialiser.
//
// Push is OPTIONAL infrastructure: if `firebase-admin` isn't installed or the
// credentials aren't configured, every push call becomes a no-op and the rest of
// the API keeps working normally. We never throw at import or boot time.
//
// Credentials are read from EITHER of these (checked in order):
//   1. FIREBASE_SERVICE_ACCOUNT_JSON  — the full service-account JSON, as a raw
//      string OR base64-encoded (recommended for Vercel env vars).
//   2. FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
//      (the private key may contain literal "\n" which we unescape).
//
// Use the SAME Firebase project the mobile app uses. The service account comes
// from: Firebase console → Project settings → Service accounts → "Generate new
// private key".

let _messaging = null;        // cached admin.messaging() instance
let _initTried = false;       // so we only attempt (and warn) once
let _warned    = false;

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw && raw.trim()) {
    let text = raw.trim();
    // Allow base64-encoded JSON (no leading "{").
    if (!text.startsWith('{')) {
      try { text = Buffer.from(text, 'base64').toString('utf8'); } catch { /* fall through */ }
    }
    try {
      return JSON.parse(text);
    } catch {
      console.warn('[firebase] FIREBASE_SERVICE_ACCOUNT_JSON is set but is not valid JSON/base64 — push disabled.');
      return null;
    }
  }

  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let   privateKey  = process.env.FIREBASE_PRIVATE_KEY;
  if (projectId && clientEmail && privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');   // unescape newlines
    return { project_id: projectId, client_email: clientEmail, private_key: privateKey };
  }

  return null;
}

// Returns admin.messaging() or null. Async because firebase-admin is imported
// dynamically (keeps the dependency optional and the boot path safe).
export async function getMessaging() {
  if (_messaging) return _messaging;
  if (_initTried) return _messaging;   // already tried and failed → stay null
  _initTried = true;

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    if (!_warned) {
      console.warn('[firebase] No Firebase credentials configured — push notifications are disabled.');
      _warned = true;
    }
    return null;
  }

  try {
    const admin = (await import('firebase-admin')).default;
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    _messaging = admin.messaging();
    console.log('[firebase] Cloud Messaging initialised.');
    return _messaging;
  } catch (err) {
    if (!_warned) {
      console.warn('[firebase] firebase-admin unavailable or failed to initialise — push disabled:', err.message);
      _warned = true;
    }
    return null;
  }
}

export async function isPushConfigured() {
  return (await getMessaging()) != null;
}
