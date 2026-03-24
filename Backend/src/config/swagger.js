import swaggerJsdoc from 'swagger-jsdoc';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const getServers = () => {
  const servers = [];
  if (process.env.RENDER_EXTERNAL_URL) {
    servers.push({ url: `${process.env.RENDER_EXTERNAL_URL}/api/v1`, description: 'Production (Render)' });
  }
  servers.push({ url: 'http://localhost:3000/api/v1', description: 'Local development' });
  return servers;
};

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'UteriFlow API',
      version: '1.0.0',
      description: 'Authentication, onboarding, and period tracking API for UteriFlow — powered by Supabase.',
      contact: { name: 'UteriFlow Team' },
    },
    servers: getServers(),
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token from Supabase. Obtain via POST /auth/login or POST /auth/password/create.',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
          },
        },
        AuthUser: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Session: {
          type: 'object',
          properties: {
            accessToken: { type: 'string', description: 'JWT — use as Bearer token' },
            refreshToken: { type: 'string' },
            expiresAt: { type: 'integer', description: 'Unix timestamp' },
          },
        },
        UserProfile: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            display_name: { type: 'string', nullable: true },
            age_group: { type: 'string', nullable: true },
            hormonal_status: { type: 'string', nullable: true },
            period_regularity: { type: 'string', nullable: true },
            health_focus: { type: 'array', items: { type: 'string' } },
            onboarding_completed: { type: 'boolean' },
            onboarding_completed_at: { type: 'string', format: 'date-time', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        PeriodLog: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date', nullable: true },
            notes: { type: 'string', nullable: true },
            is_first_log: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
      responses: {
        ValidationError: {
          description: 'Validation or business logic error',
          content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } },
        },
        Unauthorized: {
          description: 'Missing or invalid JWT token',
          content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } },
        },
        UnauthorizedError: {
          description: 'Missing or invalid JWT token',
          content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } },
        },
        Forbidden: {
          description: 'Forbidden — admin access required',
          content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' }, example: { error: 'Forbidden: admin access required', code: 'FORBIDDEN' } } },
        },
        NotFound: {
          description: 'Resource not found',
          content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } },
        },
        ConflictError: {
          description: 'Resource already exists',
          content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } },
        },
        ServerError: {
          description: 'Internal server error',
          content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } },
        },
      },
    },
    security: [],
    tags: [
      { name: 'Authentication', description: 'Register, login, OTP verification, token management' },
      { name: 'Onboarding', description: 'Step-by-step user profile setup' },
      { name: 'Period Tracking', description: 'Log and manage period cycles' },
      { name: 'Admin', description: 'Admin-only: user management, stats, period log oversight' },
    ],
  },
  apis: [join(__dirname, '../docs/*.js')],
};

export const swaggerSpec = swaggerJsdoc(options);