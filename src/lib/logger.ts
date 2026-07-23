/**
 * Structured JSON logger for production log aggregation (ELK, Datadog, Loki, etc.).
 *
 * Usage:
 * ```ts
 * import { logger } from '@/lib/logger';
 * logger.info('User logged in', { userId: 'abc' });
 * logger.error('DB connection failed', { error: err.message });
 * ```
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogContext {
  [key: string]: unknown;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

const MIN_LEVEL = (process.env.LOG_LEVEL as LogLevel) ?? 'info';
const SERVICE_NAME = 'netoptima-algerie';
const VERSION = process.env.npm_package_version ?? '0.2.0';

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= (LEVEL_PRIORITY[MIN_LEVEL] ?? 1);
}

function formatMessage(level: LogLevel, msg: string, ctx: LogContext): string {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: SERVICE_NAME,
    version: VERSION,
    message: msg,
    ...ctx,
  };
  return JSON.stringify(entry);
}

export const logger = {
  debug(msg: string, ctx: LogContext = {}) {
    if (shouldLog('debug')) console.debug(formatMessage('debug', msg, ctx));
  },

  info(msg: string, ctx: LogContext = {}) {
    if (shouldLog('info')) console.info(formatMessage('info', msg, ctx));
  },

  warn(msg: string, ctx: LogContext = {}) {
    if (shouldLog('warn')) console.warn(formatMessage('warn', msg, ctx));
  },

  error(msg: string, ctx: LogContext = {}) {
    if (shouldLog('error')) console.error(formatMessage('error', msg, ctx));
  },

  fatal(msg: string, ctx: LogContext = {}) {
    if (shouldLog('fatal')) {
      console.error(formatMessage('fatal', msg, ctx));
    }
  },

  /**
   * Create a child logger with pre-bound context (e.g. for a specific module).
   * ```ts
   * const log = logger.child({ module: 'auth' });
   * log.info('token refreshed');
   * ```
   */
  child(preset: LogContext) {
    return {
      debug: (msg: string, ctx: LogContext = {}) => logger.debug(msg, { ...preset, ...ctx }),
      info: (msg: string, ctx: LogContext = {}) => logger.info(msg, { ...preset, ...ctx }),
      warn: (msg: string, ctx: LogContext = {}) => logger.warn(msg, { ...preset, ...ctx }),
      error: (msg: string, ctx: LogContext = {}) => logger.error(msg, { ...preset, ...ctx }),
      fatal: (msg: string, ctx: LogContext = {}) => logger.fatal(msg, { ...preset, ...ctx }),
    };
  },
};

export default logger;
