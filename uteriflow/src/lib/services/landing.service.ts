import { api } from "../api";

/**
 * Landing-page submissions.
 *
 * Hits the public endpoints on the custom Express backend:
 *   POST /api/v1/landing/newsletter
 *   POST /api/v1/landing/waitlist
 *
 * On the admin side these populate the Newsletter / Waitlist pages
 * (see uteriflow/src/admin/pages/NewsletterPage.jsx and WaitlistPage.jsx).
 *
 * The backend returns the standard envelope:
 *   { status: "success", data: { message, ... }, error: null }
 * — and a 4xx with `error.code = 'CONFLICT'` plus message `already_subscribed`
 * or `already_registered` when the email is a duplicate.
 */
export const landingService = {
  async subscribeNewsletter(email: string): Promise<void> {
    await api.post("/landing/newsletter", { email });
  },

  async joinWaitlist(name: string, email: string): Promise<void> {
    await api.post("/landing/waitlist", { name, email });
  },
};

/**
 * Tiny helper that normalises an axios-style error into the strings the
 * landing components branch on. Anything that isn't a duplicate falls
 * through to the generic message.
 */
export function landingErrorCode(err: unknown): "already_registered" | "already_subscribed" | "unknown" {
  // The backend wraps errors as { error: { message, code } }.
  const e = err as { response?: { data?: { error?: { message?: string; code?: string } } } };
  const msg = e?.response?.data?.error?.message || "";
  if (msg.includes("already_registered")) return "already_registered";
  if (msg.includes("already_subscribed")) return "already_subscribed";
  return "unknown";
}
