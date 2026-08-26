import * as Sentry from '@sentry/nextjs';

/**
 * Returns true when a Sentry DSN is configured at runtime.
 * All exported helpers are no-ops when DSN is missing.
 */
function isEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);
}

/**
 * Capture an exception with optional extra context.
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!isEnabled()) return;
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a breadcrumb-level message at a given severity.
 */
export function captureMessage(
  message: string,
  level: 'debug' | 'info' | 'warning' | 'error' | 'fatal' = 'info',
): void {
  if (!isEnabled()) return;
  Sentry.captureMessage(message, { level });
}

/**
 * Set a tag that will be attached to every subsequent event.
 */
export function setTag(key: string, value: string): void {
  if (!isEnabled()) return;
  Sentry.setTag(key, value);
}

/**
 * Identify the current user. Strips sensitive fields (password, token)
 * before passing to Sentry.
 */
export function setUser(
  user: Record<string, unknown> | null,
): void {
  if (!isEnabled()) return;

  if (!user) {
    Sentry.setUser(null);
    return;
  }

  const SENSITIVE_KEYS = new Set(['password', 'token', 'accessToken', 'refreshToken', 'secret']);
  const safeUser: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(user)) {
    if (!SENSITIVE_KEYS.has(key)) {
      safeUser[key] = value;
    }
  }

  Sentry.setUser(safeUser as Sentry.User);
}
