import pino from 'pino';

import { env, isProduction, isDevelopment } from './env';

/* ------------------------------------------------------------------ */
/*  Sensitive-field redaction paths                                    */
/* ------------------------------------------------------------------ */
const REDACT_PATHS = [
  'password',
  'secret',
  'token',
  'authorization',
  'cookie',
] as const;

/* ------------------------------------------------------------------ */
/*  Determine log level                                               */
/* ------------------------------------------------------------------ */
const logLevel = isProduction
  ? (env.LOG_LEVEL ?? 'info')
  : 'debug';

/* ------------------------------------------------------------------ */
/*  Build the pino instance                                           */
/* ------------------------------------------------------------------ */

/**
 * In development we pipe through pino-pretty for colourised,
 * human-readable output.  In production we emit raw JSON to stdout.
 */
function createLogger() {
  const baseOptions: pino.LoggerOptions = {
    level: logLevel,
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: REDACT_PATHS,
      censor: '[REDACTED]',
    },
  };

  if (isDevelopment) {
    // Lazy-require pino-pretty so the import only runs in dev.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const prettyStream = require('pino-pretty')({
      colorize: true,
      translateTime: 'SYS:iso',
      ignore: 'pid,hostname',
    });

    return pino(baseOptions, prettyStream);
  }

  return pino(baseOptions);
}

/**
 * Root logger instance.
 *
 * Usage:
 *   import { logger } from '@/lib/pino-logger';
 *   logger.info('Hello');
 *   logger.error({ err }, 'Something failed');
 */
export const logger = createLogger();

/* ------------------------------------------------------------------ */
/*  Child-logger factory                                              */
/* ------------------------------------------------------------------ */

/**
 * Create a child logger bound to a specific component / module.
 *
 * Every log line emitted by the child will carry a `component` field,
 * making it easy to filter logs by subsystem.
 *
 * @example
 *   const log = child('billing-service');
 *   log.info('Invoice generated', { invoiceId: 42 });
 *   // → { component: "billing-service", level: 30, msg: "Invoice generated", invoiceId: 42, … }
 */
export function child(component: string): pino.Logger {
  return logger.child({ component });
}

/* ------------------------------------------------------------------ */
/*  Request logging helper                                            */
/* ------------------------------------------------------------------ */

/**
 * Log an incoming HTTP request at `info` level.
 *
 * Extracts `method`, `url`, and `user-agent` from the standard
 * Web API `Request` object used in Next.js App Router route handlers.
 *
 * @example
 *   export async function GET(req: Request) {
 *     logRequest(req);
 *     return NextResponse.json({ ok: true });
 *   }
 */
export function logRequest(req: Request): void {
  logger.info({
    method: req.method,
    url: req.url,
    'user-agent': req.headers.get('user-agent') ?? 'unknown',
  }, `${req.method} ${new URL(req.url).pathname}`);
}

export default logger;
