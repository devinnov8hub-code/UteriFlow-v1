import sanitizeHtml from 'sanitize-html';

/**
 * Rich-text handling for lifestyle articles.
 *
 * The admin portal now uses a WYSIWYG editor that produces HTML. That HTML is
 * rendered on the public landing page and inside the mobile app, so it is
 * sanitised HERE — on the server — before it is ever stored. Sanitising only in
 * the browser would be pointless: anyone can post directly to the API.
 *
 * Storage model (fully backward compatible):
 *   content       → plain text. Existing column, still populated on every save.
 *                   Older mobile builds keep reading this and keep working.
 *   content_html  → new column holding the formatted version.
 *
 * Clients should render content_html when it is present and fall back to
 * content when it is not.
 */

// Deliberately tight allowlist: everything the editor can produce, nothing else.
// No <script>, <iframe>, <style>, no event handlers, no inline JS URLs.
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote',
  'h1', 'h2', 'h3', 'h4',
  'ul', 'ol', 'li',
  'a', 'code', 'pre', 'hr', 'span',
];

const SANITIZE_OPTIONS = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    // Only text-alignment styles survive; see allowedStyles below.
    '*': ['style'],
  },
  allowedStyles: {
    '*': {
      'text-align': [/^(left|right|center|justify)$/],
    },
  },
  // http/https/mailto only — blocks javascript: and data: URLs.
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesAppliedToAttributes: ['href'],
  transformTags: {
    // Any external link opens safely.
    a: (tagName, attribs) => ({
      tagName: 'a',
      attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer nofollow' },
    }),
  },
  // Drop the contents of anything disallowed rather than leaking raw text.
  nonTextTags: ['style', 'script', 'textarea', 'option', 'noscript'],
};

/** Sanitise editor HTML. Returns '' for empty/invalid input. */
export function sanitizeArticleHtml(html) {
  if (typeof html !== 'string' || html.trim() === '') return '';
  return sanitizeHtml(html, SANITIZE_OPTIONS).trim();
}

/**
 * Derive readable plain text from HTML, preserving block structure as line
 * breaks. This keeps the legacy `content` column meaningful, so any client
 * that hasn't been updated yet still shows a readable article rather than a
 * wall of tags.
 */
export function htmlToPlainText(html) {
  if (typeof html !== 'string' || html.trim() === '') return '';

  let text = html;

  // List items → "• item" on their own line. Closing </li> is consumed here so
  // it doesn't also emit a newline and double-space the list.
  text = text.replace(/<li[^>]*>/gi, '\n• ');
  text = text.replace(/<\/li>/gi, '');
  // Block-level boundaries → newlines.
  text = text.replace(/<\/(p|div|h[1-6]|blockquote|tr|ul|ol|pre)>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<hr\s*\/?>/gi, '\n---\n');

  // Strip all remaining tags.
  text = text.replace(/<[^>]+>/g, '');

  // Decode the entities the editor actually emits.
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Collapse runaway blank lines and trailing spaces.
  return text
    .split('\n')
    .map(l => l.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** True when a string contains HTML markup (vs. plain text typed by hand). */
export function looksLikeHtml(value) {
  return typeof value === 'string' && /<\/?[a-z][\s\S]*>/i.test(value);
}

/** Rough reading time in minutes, from plain text. Minimum 1. */
export function estimateReadTime(plainText) {
  const words = (plainText || '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/**
 * Normalise whatever the client sent into the pair of columns we store.
 * Accepts either `contentHtml` (new editor) or `content` (legacy plain text,
 * or HTML pasted into the old field).
 */
export function normalizeArticleContent({ content, contentHtml }) {
  const rawHtml = (typeof contentHtml === 'string' && contentHtml.trim() !== '')
    ? contentHtml
    : (looksLikeHtml(content) ? content : null);

  if (rawHtml) {
    const safeHtml = sanitizeArticleHtml(rawHtml);
    return { content_html: safeHtml, content: htmlToPlainText(safeHtml) };
  }

  // Plain text only — no HTML to store.
  return { content_html: null, content: typeof content === 'string' ? content : '' };
}
