/**
 * Image upload route
 * Mounted at /api/v1/upload
 *
 * Flow:
 *   1. Frontend sends a multipart/form-data POST with field `file` (image)
 *   2. Server validates type + size, uploads to Supabase Storage
 *   3. Returns the public URL → frontend stores it and passes as `image_url`
 *      when calling POST /community/posts
 *
 * Supabase Storage bucket: "post-images"  (public bucket, see migration below)
 */

import express   from 'express';
import { param } from 'express-validator';
import { authenticateUser } from '../middleware/auth.js';
import { getSupabaseAdmin }  from '../config/supabase.js';
import { AppError, ValidationError } from '../errors/index.js';
import { success } from '../utils/response.js';

const router = express.Router();
router.use(authenticateUser);

// ─── Config ───────────────────────────────────────────────────
const BUCKET          = 'post-images';      // existing community-post bucket (unchanged)
const ARTICLE_BUCKET  = 'article-images';   // new bucket for admin article covers
const MAX_BYTES       = 5 * 1024 * 1024;   // 5 MB
const ALLOWED_TYPES   = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXTS    = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

// ─── Tiny built-in multipart parser (no extra dependency) ─────
// Parses a single-file multipart/form-data body.
// We use the raw Buffer approach to avoid adding multer/busboy dependencies.
function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.+)$/i);
    if (!boundaryMatch) return reject(new ValidationError('Content-Type must be multipart/form-data'));

    const boundary = boundaryMatch[1].trim();
    const chunks   = [];

    req.on('data',  chunk => chunks.push(chunk));
    req.on('error', reject);
    req.on('end', () => {
      try {
        const body    = Buffer.concat(chunks);
        const delim   = Buffer.from(`\r\n--${boundary}`);
        const parts   = [];

        let start = body.indexOf(`--${boundary}`) + `--${boundary}`.length + 2; // skip first delimiter + CRLF
        while (start < body.length) {
          const end = body.indexOf(delim, start);
          if (end === -1) break;
          parts.push(body.slice(start, end));
          start = end + delim.length + 2;
        }

        let file = null;
        for (const part of parts) {
          const headerEnd = part.indexOf('\r\n\r\n');
          if (headerEnd === -1) continue;
          const headerStr = part.slice(0, headerEnd).toString();
          const dataBytes = part.slice(headerEnd + 4);

          const nameMatch     = headerStr.match(/name="([^"]+)"/i);
          const filenameMatch = headerStr.match(/filename="([^"]+)"/i);
          const ctMatch       = headerStr.match(/Content-Type:\s*(.+)/i);

          if (nameMatch?.[1] === 'file' && filenameMatch) {
            file = {
              originalName: filenameMatch[1],
              mimeType:     (ctMatch?.[1] || '').trim().split(';')[0].trim(),
              buffer:       dataBytes,
            };
          }
        }
        resolve(file);
      } catch (e) { reject(e); }
    });
  });
}

// ─── POST /upload/image ───────────────────────────────────────
// Accepts: multipart/form-data  field name: "file"
// Returns: { url: "https://..." }
router.post('/image', async (req, res, next) => {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) throw new AppError('Storage service unavailable — SUPABASE_SERVICE_ROLE_KEY missing', 503, 'SERVICE_UNAVAILABLE');

    const file = await parseMultipart(req);

    if (!file) throw new ValidationError('No file uploaded. Send a multipart/form-data request with field name "file".');
    if (!ALLOWED_TYPES.includes(file.mimeType)) {
      throw new ValidationError(`Unsupported file type "${file.mimeType}". Allowed: jpeg, png, webp, gif.`);
    }
    if (file.buffer.length > MAX_BYTES) {
      throw new ValidationError(`File too large (${(file.buffer.length / 1024 / 1024).toFixed(1)} MB). Maximum is 5 MB.`);
    }
    if (file.buffer.length === 0) {
      throw new ValidationError('Uploaded file is empty.');
    }

    // Build a unique storage path:  userId/timestamp-random.ext
    const ext      = ALLOWED_EXTS[file.mimeType];
    const userId   = req.user.id;
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const path     = `${userId}/${filename}`;

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, file.buffer, {
        contentType:  file.mimeType,
        cacheControl: '3600',
        upsert:       false,
      });

    if (uploadError) {
      // Surface a clear message for the most common storage errors
      if (uploadError.message?.includes('Bucket not found')) {
        throw new AppError(
          `Storage bucket "${BUCKET}" does not exist. Run the v3 migration SQL to create it.`,
          500, 'STORAGE_BUCKET_MISSING'
        );
      }
      throw uploadError;
    }

    // Get the public URL
    const { data: { publicUrl } } = admin.storage
      .from(BUCKET)
      .getPublicUrl(path);

    return success(res, {
      message: 'Image uploaded successfully',
      url:     publicUrl,
    }, 201);
  } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════════
//  ARTICLE COVER IMAGES  (Admin Portal → Articles)
//  Added so admins can upload a cover image directly from their
//  device or import one from cloud storage (Google Drive, Dropbox,
//  OneDrive, or any public link) instead of being forced to paste a
//  raw image URL — which frequently broke, because share links from
//  cloud drives are HTML viewer pages, not direct image files, and
//  hotlinked URLs expire or block embedding.
//
//  Both endpoints below store the image in OUR Supabase Storage and
//  return a permanent public URL, so covers never break again.
//
//  Existing POST /upload/image is untouched (community posts still use it).
// ══════════════════════════════════════════════════════════════

// Store a buffer in `bucket`, falling back to the existing post-images bucket
// if the article bucket hasn't been created yet — so uploads keep working even
// before the v9 migration is run.
async function storeImage(admin, buffer, mimeType, userId, folder = 'articles') {
  const ext      = ALLOWED_EXTS[mimeType];
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path     = `${folder}/${userId}/${filename}`;

  const attempt = async (bucket) => {
    const { error } = await admin.storage.from(bucket).upload(path, buffer, {
      contentType: mimeType,
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) return { error };
    const { data: { publicUrl } } = admin.storage.from(bucket).getPublicUrl(path);
    return { publicUrl };
  };

  let res = await attempt(ARTICLE_BUCKET);
  if (res.error && /bucket not found/i.test(res.error.message || '')) {
    // Graceful fallback — keeps the feature working pre-migration.
    res = await attempt(BUCKET);
    if (res.error && /bucket not found/i.test(res.error.message || '')) {
      throw new AppError(
        `Storage bucket "${ARTICLE_BUCKET}" does not exist. Run migration v9_article_images_bucket.sql in Supabase.`,
        500, 'STORAGE_BUCKET_MISSING'
      );
    }
  }
  if (res.error) throw res.error;
  return res.publicUrl;
}

// Detect real image type from magic bytes — we never trust a remote
// Content-Type header alone.
function sniffMimeType(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'image/gif';
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

// Turn a cloud "share" link into a direct-download link.
// Google Drive / Dropbox / OneDrive share URLs point at an HTML preview page,
// which is exactly why pasting them into the image-URL field never worked.
function normalizeCloudLink(rawUrl) {
  let url = rawUrl.trim();

  // Google Drive:  /file/d/<ID>/view  |  ?id=<ID>  |  /uc?id=<ID>
  const gd = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^&]*&)*id=)([\w-]{10,})/);
  if (gd) return `https://drive.google.com/uc?export=download&id=${gd[1]}`;

  // Google Docs/Photos direct-host form
  const gusr = url.match(/lh\d\.googleusercontent\.com\/d\/([\w-]{10,})/);
  if (gusr) return url;

  // Dropbox: force the raw file instead of the preview page
  if (/dropbox\.com/.test(url)) {
    url = url.replace(/([?&])dl=0/, '$1raw=1');
    if (!/[?&](raw|dl)=/.test(url)) url += (url.includes('?') ? '&' : '?') + 'raw=1';
    return url;
  }

  // OneDrive / SharePoint: request the download variant
  if (/1drv\.ms|onedrive\.live\.com|sharepoint\.com/.test(url) && !/download=1/.test(url)) {
    return url + (url.includes('?') ? '&' : '?') + 'download=1';
  }

  return url;
}

// Block obvious SSRF targets (localhost / private ranges / non-http schemes).
function assertSafeRemoteUrl(url) {
  let parsed;
  try { parsed = new URL(url); } catch { throw new ValidationError('That does not look like a valid link.'); }
  if (!/^https?:$/.test(parsed.protocol)) throw new ValidationError('Only http(s) links are supported.');
  const host = parsed.hostname.toLowerCase();
  const blocked =
    host === 'localhost' || host === '::1' || host.endsWith('.local') ||
    /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (blocked) throw new ValidationError('That link cannot be reached.');
  return parsed;
}

// ─── POST /upload/article-image ───────────────────────────────
// Upload a cover image straight from the admin's device.
// Accepts: multipart/form-data, field name "file"   →  { url }
router.post('/article-image', async (req, res, next) => {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) throw new AppError('Storage service unavailable — SUPABASE_SERVICE_ROLE_KEY missing', 503, 'SERVICE_UNAVAILABLE');

    const file = await parseMultipart(req);
    if (!file) throw new ValidationError('No file received. Please choose an image and try again.');

    // Trust the file's actual bytes over its declared type.
    const sniffed = sniffMimeType(file.buffer);
    const mimeType = sniffed || file.mimeType;

    if (!ALLOWED_TYPES.includes(mimeType)) {
      throw new ValidationError('Unsupported image type. Please use a JPG, PNG, WEBP or GIF.');
    }
    if (file.buffer.length === 0) throw new ValidationError('That image file appears to be empty.');
    if (file.buffer.length > MAX_BYTES) {
      throw new ValidationError(`Image is too large (${(file.buffer.length / 1024 / 1024).toFixed(1)} MB). Maximum size is 5 MB.`);
    }

    const url = await storeImage(admin, file.buffer, mimeType, req.user.id);
    return success(res, { message: 'Image uploaded successfully', url }, 201);
  } catch (err) { next(err); }
});

// ─── POST /upload/image-from-url ──────────────────────────────
// Import a cover image from Google Drive / Dropbox / OneDrive / any public link.
// We download it server-side and re-host it in our own storage, so the article
// cover keeps working even if the original link is later removed or blocked.
// Body: { "url": "https://…" }   →  { url }
router.post('/image-from-url', async (req, res, next) => {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) throw new AppError('Storage service unavailable — SUPABASE_SERVICE_ROLE_KEY missing', 503, 'SERVICE_UNAVAILABLE');

    const raw = (req.body?.url || '').toString().trim();
    if (!raw) throw new ValidationError('Please paste an image link first.');

    const direct = normalizeCloudLink(raw);
    assertSafeRemoteUrl(direct);

    // Fetch with a timeout so a slow host can't hang the request.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    let response;
    try {
      response = await fetch(direct, {
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UteriFlowBot/1.0)' },
      });
    } catch (e) {
      throw new ValidationError(
        e.name === 'AbortError'
          ? 'That link took too long to respond. Try uploading the image from your device instead.'
          : 'We could not reach that link. Make sure it is publicly accessible.'
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new ValidationError(
        `We could not download that image (HTTP ${response.status}). If it is on Google Drive, set sharing to "Anyone with the link".`
      );
    }

    const declared = (response.headers.get('content-type') || '').split(';')[0].trim();
    const buffer   = Buffer.from(await response.arrayBuffer());

    if (buffer.length === 0) throw new ValidationError('That link did not return any image data.');
    if (buffer.length > MAX_BYTES) {
      throw new ValidationError(`That image is too large (${(buffer.length / 1024 / 1024).toFixed(1)} MB). Maximum size is 5 MB.`);
    }

    // Magic-byte sniff is authoritative: a Drive/OneDrive share page returns
    // HTML, which we must reject with a message the admin can act on.
    const mimeType = sniffMimeType(buffer);
    if (!mimeType || !ALLOWED_TYPES.includes(mimeType)) {
      const looksLikeHtml = declared.includes('text/html') || buffer.slice(0, 15).toString('ascii').toLowerCase().includes('<!doctype');
      throw new ValidationError(
        looksLikeHtml
          ? 'That link opens a web page, not an image file. On Google Drive, share the file with "Anyone with the link", or simply upload the image from your device.'
          : 'That link is not a supported image (JPG, PNG, WEBP or GIF).'
      );
    }

    const url = await storeImage(admin, buffer, mimeType, req.user.id);
    return success(res, { message: 'Image imported successfully', url }, 201);
  } catch (err) { next(err); }
});

export default router;
