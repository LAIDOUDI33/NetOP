import { z } from 'zod';

/**
 * Zod schema for all environment variables used across the NetOP platform.
 *
 * Categories:
 *   - Database  : DATABASE_URL, POSTGRES_*
 *   - Redis     : REDIS_URL
 *   - NextAuth  : NEXTAUTH_SECRET, NEXTAUTH_URL
 *   - AI SDK    : ZAI_API_KEY
 *   - Logging   : LOG_LEVEL
 *   - Node      : NODE_ENV, PORT
 *
 * Required variables will cause a crash at startup when missing.
 * Optional variables fall back to sensible defaults.
 */
const envSchema = z.object({
  // ── Database ──────────────────────────────────────────────
  DATABASE_URL: z.string().default('file:./db/dev.db'),

  POSTGRES_USER: z.string().optional(),
  POSTGRES_PASSWORD: z.string().optional(),
  POSTGRES_DB: z.string().optional(),

  // ── Redis ─────────────────────────────────────────────────
  REDIS_URL: z.string().optional(),

  // ── NextAuth ───────────────────────────────────────────────
  NEXTAUTH_SECRET: z.string().optional().default('dev-secret-change-in-production-32chars!!'),
  NEXTAUTH_URL: z.string().url().optional().default('http://localhost:3000'),

  // ── AI SDK ─────────────────────────────────────────────────
  ZAI_API_KEY: z.string().optional(),

  // ── Logging ────────────────────────────────────────────────
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .optional(),

  // ── Node ───────────────────────────────────────────────────
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .optional()
    .default('development'),
  PORT: z.coerce.number().int().positive().optional().default(3000),
});

/**
 * Parse and validate all environment variables at module-load time.
 * If any required variable is missing or malformed, the app crashes
 * immediately with a clear Zod error message (fail-fast strategy).
 */
export const env = envSchema.parse(process.env);

/**
 * Convenience booleans derived from NODE_ENV.
 */
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
