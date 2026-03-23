// ─── Load .env FIRST — before all other imports ───────────────────────────────
import './config/env.js';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
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

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Rate limiting ────────────────────────────────────────────────────────────
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

// ─── Request logger ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// ─── Health / root ────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ name: "UteriFlow API", version: '1.0.0', documentation: '/api-docs', health: '/health' }));
app.get('/health', (req, res) => res.json({ status: 'healthy', timestamp: new Date().toISOString(), env: NODE_ENV }));

// ─── Swagger docs ─────────────────────────────────────────────────────────────
// swagger-ui-express static assets break on Vercel serverless
// Serve raw JSON spec + redirect to swagger.io online viewer

app.get('/api-docs/spec.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(swaggerSpec);
});

app.get('/api-docs', (req, res) => {
  const specUrl = `${req.protocol}://${req.get('host')}/api-docs/spec.json`;
  res.redirect(`https://petstore.swagger.io/?url=${encodeURIComponent(specUrl)}`);
});

// Full Swagger UI only on local dev
if (!process.env.VERCEL) {
  app.use('/api-docs/ui', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'UteriFlow API Docs',
    swaggerOptions: { persistAuthorization: true },
  }));
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/onboarding', onboardingRoutes);
app.use('/api/v1/period', periodRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/admin', communityRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found`, code: 'NOT_FOUND' }));

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, ...(err.code && { code: err.code }) });
  }
  const isSupabaseError = err?.message && (err.code || err.details || err.hint);
  if (isSupabaseError) {
    console.error('[Supabase Error]', { message: err.message, code: err.code, details: err.details });
    return res.status(500).json({ error: 'A database error occurred.', code: 'DATABASE_ERROR' });
  }
  console.error('[Unhandled Error]', err);
  return res.status(500).json({
    error: NODE_ENV === 'production' ? 'Internal server error.' : err.message,
    code: 'INTERNAL_ERROR',
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
// On Vercel (serverless) skip app.listen — just export the app
if (!process.env.VERCEL) {
  app.listen(PORT, async () => {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('\n⚠️  WARNING: SUPABASE_SERVICE_ROLE_KEY is not set in .env');
      console.error('   All /admin/* routes will return 503 until this is added.\n');
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
        console.error(`[SMTP] ❌ Connection FAILED: ${err.message}`);
        console.error(`[SMTP]    Emails will fall back to console output until resolved.\n`);
      }
    } else {
      console.warn('[SMTP] ⚠️  No SMTP config — emails will print to console only.\n');
    }
  });
}

export default app;
