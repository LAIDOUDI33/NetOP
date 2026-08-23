import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Recommended setting for Next.js: sample at 10% for performance tracing
  tracesSampleRate: 0.1,

  // Session Replay configuration
  // Capture 1% of normal sessions for replay
  replaysSessionSampleRate: 0.01,
  // Capture 100% of sessions with errors for replay
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      // Mask all text content and block all media by default
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter out localhost and internal addresses from traces
  tracePropagationTargets: [
    /^(?!.*(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]))/,
  ],

  // Set the environment based on NODE_ENV
  environment: process.env.NODE_ENV || 'development',

  // Set release for deploy tracking
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

  // Strip PII before sending events to Sentry
  beforeSend(event) {
    if (event.request) {
      // Remove cookies from request headers
      if (event.request.headers) {
        delete event.request.headers['cookie'];
        delete event.request.headers['set-cookie'];
        delete event.request.headers['authorization'];
        delete event.request.headers['x-auth-token'];
      }

      // Strip sensitive query parameters
      if (event.request.query_string) {
        let qs = event.request.query_string;
        qs = qs.replace(/(password|token|secret|api_key|apikey|access_token)=[^&]*/gi, '$1=[REDACTED]');
        event.request.query_string = qs;
      }
    }

    // Scrub PII from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
        if (breadcrumb.type === 'http' && breadcrumb.data) {
          const data = { ...breadcrumb.data };
          if (data.url) {
            data.url = data.url.replace(/(password|token|secret|api_key|apikey|access_token)=[^&]*/gi, '$1=[REDACTED]');
          }
          return { ...breadcrumb, data };
        }
        return breadcrumb;
      });
    }

    return event;
  },
});
