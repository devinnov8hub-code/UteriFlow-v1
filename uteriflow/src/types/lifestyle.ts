export interface LifestyleTip {
  id: string;
  title: string;
  summary: string;
  image_url?: string | null;
  category: string;
  read_time: number;
  created_at: string;
}
 export interface LifestyleTipDetail extends LifestyleTip {
  content: string;
  /* Sanitised rich-text body from the admin editor. Render this when present;
     fall back to `content` (plain text) for articles written before the
     rich-text editor existed. */
  content_html?: string | null;
}