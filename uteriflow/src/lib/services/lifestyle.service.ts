import { api } from "../api";
import type { LifestyleTip, LifestyleTipDetail } from "../../types/lifestyle";

/**
 * Lifestyle / wellness articles consumed by the public landing page
 * (Home, Articles, TipDetail).
 *
 * The backend wraps every response as:
 *   { status: 'success', data: { ... }, error: null }
 *
 * For these endpoints specifically the payloads are:
 *   GET /lifestyle      → { status, data: { articles: LifestyleTip[], pagination }, error }
 *   GET /lifestyle/:id  → { status, data: { article: LifestyleTipDetail }, error }
 *
 * The earlier version of this file did `return response.data` which gave
 * callers the whole envelope object (not an array of tips). The pages then
 * called `tips.map(...)` on an object → silently rendered nothing. Below we
 * unwrap once at the service layer so callers get plain arrays / objects of
 * the documented types.
 */
export const lifestyleService = {
  getLifestyle: async (): Promise<LifestyleTip[]> => {
    const response = await api.get("/lifestyle");
    return response.data?.data?.articles ?? [];
  },

  getLifestyleById: async (id: string): Promise<LifestyleTipDetail | null> => {
    const response = await api.get(`/lifestyle/${id}`);
    return response.data?.data?.article ?? null;
  },
};
