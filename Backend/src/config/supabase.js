import { createClient } from '@supabase/supabase-js';

const getUrl  = () => process.env.SUPABASE_URL;
const getAnon = () => process.env.SUPABASE_ANON_KEY;
const getSvc  = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

// ─── Admin client (service role) — for admin routes only ──────
let _supabaseAdmin = null;

export const getSupabaseAdmin = () => {
  if (!_supabaseAdmin) {
    const svc = getSvc();
    if (!svc) return null;
    _supabaseAdmin = createClient(getUrl(), svc, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _supabaseAdmin;
};

export const supabaseAdmin = {
  get auth() { return getSupabaseAdmin()?.auth; },
  from(table) { return getSupabaseAdmin()?.from(table); },
};

// ─── Per-request authenticated client ─────────────────────────
// In supabase-js v2, a server-side app must create a client that carries
// the user's JWT on every DB call so that Row Level Security evaluates
// correctly. Using a singleton anon client means RLS sees every query as
// unauthenticated → silently returns empty rows instead of the user's data.
//
// Usage in middleware:  req.supabase = createUserClient(token)
// Usage in routes:      req.supabase.from('posts').select(...)
export function createUserClient(accessToken) {
  return createClient(getUrl(), getAnon(), {
    auth: {
      autoRefreshToken:  false,
      persistSession:    false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

// ─── Anon client — ONLY for auth operations (login, refresh, etc.) ──
// Do NOT use this for database queries from authenticated routes.
let _anonClient = null;
export const getAnonClient = () => {
  if (!_anonClient) {
    _anonClient = createClient(getUrl(), getAnon(), {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
  }
  return _anonClient;
};

// Legacy default export kept for auth routes that call supabase.auth.*
export default {
  get auth() { return getAnonClient().auth; },
  // .from() here uses the ANON key — only use this in auth routes (login, register, OTP)
  // where there is no authenticated user yet. All other routes must use req.supabase.from().
  from(table) { return getAnonClient().from(table); },
};
