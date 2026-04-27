import axios from "axios";

/**
 * Public landing-page API client.
 *
 * Used by Home / Articles / TipDetail to fetch published wellness articles.
 * The /lifestyle endpoints on the backend are intentionally PUBLIC (no auth
 * middleware) so unauthenticated visitors can browse them.
 *
 * The waitlist form uses Forminit (third-party form service) directly via the
 * Forminit SDK with VITE_FORM_ID. It does NOT go through this client.
 *
 * VITE_API_URL handling matches admin/api.js — accepts either form:
 *   VITE_API_URL=https://uteri-flow-v1.vercel.app          ← we'll append /api/v1
 *   VITE_API_URL=https://uteri-flow-v1.vercel.app/api/v1   ← used as-is
 */
function resolveBase(envValue: string | undefined): string {
  const raw = (envValue || "http://localhost:3000").replace(/\/+$/, "");
  return /\/api\/v\d+$/.test(raw) ? raw : `${raw}/api/v1`;
}

export const api = axios.create({
  baseURL: resolveBase(import.meta.env.VITE_API_URL),
  headers: {
    "Content-Type": "application/json",
  },
});
