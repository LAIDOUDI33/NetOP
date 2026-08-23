import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Recommended setting for Next.js: sample at 10% for performance tracing
  tracesSampleRate: 0.1,

  // Keep integrations minimal — Edge Runtime has limited API access.
  // browserTracingIntegration and replayIntegration are NOT available here.
  integrations: [],

  // Set the environment based on NODE_ENV
  environment: process.env.NODE_ENV || 'development',

  // Set release for deploy tracking
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
});
