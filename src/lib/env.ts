import { z } from "zod";

const envSchema = z.object({
  // ── Database ────────────────────────────────────────────────────
  DATABASE_URL: z.string().default("postgresql://netop:netop@localhost:5432/netop"),

  // ── NextAuth ────────────────────────────────────────────────────
  NEXTAUTH_SECRET: z.string().default("change-me-in-production"),
  NEXTAUTH_URL: z.string().default("http://localhost:3000"),

  // ── Runtime ─────────────────────────────────────────────────────
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // ── Logging ─────────────────────────────────────────────────────
  LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error", "fatal"])
    .default("info"),

  // ── CORS ────────────────────────────────────────────────────────
  CORS_ORIGINS: z.string().default("http://localhost:3000"),

  // ── Sentry ──────────────────────────────────────────────────────
  NEXT_PUBLIC_SENTRY_DSN: z.string().default(""),
  SENTRY_DSN: z.string().default(""),
  NEXT_PUBLIC_SENTRY_RELEASE: z.string().default(""),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate and parse environment variables at module load time.
 * Missing optional values receive their Zod defaults.
 */
export const env = envSchema.parse(process.env);
