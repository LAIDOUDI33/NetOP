import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Recommended setting for Next.js: sample at 10% for performance tracing
  tracesSampleRate: 0.1,

  integrations: [
    // Capture database query errors from Prisma/PostgreSQL
    Sentry.postgresIntegration(),
    // Track outbound HTTP requests
    Sentry.httpIntegration({
      breadcrumbs: true,
      tracing: true,
    }),
  ],

  // Deny traces from health-check and internal endpoints
  denyUrls: [
    /\/api\/health(-check)?\//,
    /\/api\/route$/,
    /\/internal\//,
    /\/_next\//,
  ],

  // Set the environment based on NODE_ENV
  environment: process.env.NODE_ENV || 'development',

  // Set release for deploy tracking
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

  // Strip sensitive headers and PII before sending to Sentry
  beforeSend(event) {
    if (event.request) {
      // Remove sensitive headers
      if (event.request.headers) {
        const sensitiveHeaders = [
          'authorization',
          'cookie',
          'set-cookie',
          'x-auth-token',
          'x-api-key',
          'x-forwarded-for',
          'x-real-ip',
        ];
        for (const header of sensitiveHeaders) {
          delete event.request.headers[header];
          // Also try lowercase variants
          delete event.request.headers[header.toUpperCase()];
        }
      }

      // Strip sensitive query parameters
      if (event.request.query_string) {
        let qs = event.request.query_string;
        qs = qs.replace(/(password|token|secret|api_key|apikey|access_token|session|sid)=[^&]*/gi, '$1=[REDACTED]');
        event.request.query_string = qs;
      }

      // Redact user data if present
      if (event.user) {
        if (event.user.email) event.user.email = '[REDACTED]';
        if (event.user.ip_address) event.user.ip_address = '[REDACTED]';
        if ((event.user as Record<string, string>).password) {
          delete (event.user as Record<string, string>).password;
        }
      }
    }

    // Scrub PII from exception messages where possible
    if (event.exception?.values) {
      event.exception.values = event.exception.values.map((exception) => {
        if (exception.value) {
          exception.value = exception.value.replace(
            /(password|token|secret|api_?key|access_token|session_id|authorization)["']?\s*[:=]\s*['"]?([^'"\s,}]+)/gi,
            '$1=[REDACTED]'
          );
        }
        return exception;
      });
    }

    return event;
  },
});
