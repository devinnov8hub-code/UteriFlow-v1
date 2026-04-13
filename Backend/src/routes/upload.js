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
const BUCKET          = 'post-images';
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

export default router;
