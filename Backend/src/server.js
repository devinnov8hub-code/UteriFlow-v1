import './config/env.js';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { swaggerSpec } from './config/swagger.js';
import authRoutes from './routes/auth.js';
import onboardingRoutes from './routes/onboarding.js';
import periodRoutes from './routes/period.js';
import adminRoutes from './routes/admin.js';
import communityRoutes from './routes/community.js';
import { AppError } from './errors/index.js';

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "unpkg.com", "cdn.jsdelivr.net"],
      styleSrc:  ["'self'", "'unsafe-inline'", "unpkg.com", "cdn.jsdelivr.net"],
      imgSrc:    ["'self'", "data:", "https:"],
      connectSrc:["'self'", "https:", "http:"],
      workerSrc: ["blob:"],
    },
  },
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.', code: 'RATE_LIMITED' },
});
app.use(globalLimiter);

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

app.get('/', (req, res) => res.json({ name: 'UteriFlow API', version: '1.0.0', documentation: '/api-docs', health: '/health' }));
app.get('/health', (req, res) => res.json({ status: 'healthy', timestamp: new Date().toISOString(), env: NODE_ENV }));

// ─── Swagger: serve spec as JSON ──────────────────────────────────────────────
app.get('/api-docs/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ─── Swagger: CDN-based UI (avoids Vercel MIME-type issues with swagger-ui-express) ──
app.get('/api-docs', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>UteriFlow API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css" />
  <style>
    body { margin: 0; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: window.location.origin + '/api-docs/swagger.json',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: 'StandaloneLayout',
        persistAuthorization: true,
      });
    };
  </script>
</body>
</html>`);
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/v1/auth',       authLimiter, authRoutes);
app.use('/api/v1/onboarding', onboardingRoutes);
app.use('/api/v1/period',     periodRoutes);
app.use('/api/v1/admin',      adminRoutes);
app.use('/api/v1/admin',      communityRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found`, code: 'NOT_FOUND' }));

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  const errResponse = (statusCode, message, code) =>
    res.status(statusCode).json({ status: 'error', data: null, error: { message, code } });

  if (err instanceof AppError) {
    return errResponse(err.statusCode, err.message, err.code || 'ERROR');
  }
  const isSupabaseError = err?.message && (err.code || err.details || err.hint);
  if (isSupabaseError) {
    console.error('[Supabase Error]', { message: err.message, code: err.code, details: err.details });
    return errResponse(500, 'A database error occurred.', 'DATABASE_ERROR');
  }
  console.error('[Unhandled Error]', err);
  return errResponse(
    500,
    NODE_ENV === 'production' ? 'Internal server error.' : err.message,
    'INTERNAL_ERROR'
  );
});

// ─── Start (local dev only — Vercel uses export default) ──────────────────────
const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;
if (!isVercel) {
  app.listen(PORT, async () => {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('\n⚠️  WARNING: SUPABASE_SERVICE_ROLE_KEY is not set — admin routes will fail\n');
    } else {
      console.log('[Supabase] ✅ Service role key loaded — admin routes active');
    }
    console.log(`\nUteriFlow API running — port ${PORT} [${NODE_ENV}]`);
    console.log(`Swagger docs: http://localhost:${PORT}/api-docs`);
    console.log(`Health:       http://localhost:${PORT}/health\n`);

    const smtpHost = (process.env.SMTP_HOST || '').trim();
    const smtpUser = (process.env.SMTP_USER || '').trim();
    const smtpPass = (process.env.SMTP_PASS || '').trim();

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.default.createTransport({
          host: smtpHost,
          port: parseInt((process.env.SMTP_PORT || '587').trim()),
          secure: false,
          auth: { user: smtpUser, pass: smtpPass },
          tls: { rejectUnauthorized: false },
          connectionTimeout: 8000,
        });
        await transporter.verify();
        console.log(`[SMTP] ✅ Connected to ${smtpHost} — emails will be sent via Resend\n`);
      } catch (err) {
        console.error(`[SMTP] ❌ Connection FAILED: ${err.message}\n`);
      }
    } else {
      console.warn('[SMTP] ⚠️  No SMTP config — emails will print to console only.\n');
    }
  });
}

export default app;