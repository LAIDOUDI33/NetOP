/**
 * Simple structured logger for server-side code.
 * Levels: debug, info, warn, error
 * Output: JSON format with timestamp, level, message, context
 * Usage: logger.info('Pipeline started', { pipelineId: 'xxx', records: 1000 })
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL = (process.env.LOG_LEVEL as LogLevel) ?? 'info';
const IS_DEV = process.env.NODE_ENV !== 'production';

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= (LEVEL_PRIORITY[MIN_LEVEL] ?? 1);
}

function formatMessage(level: LogLevel, msg: string, ctx: LogContext): string {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message: msg,
    ...(Object.keys(ctx).length > 0 ? { context: ctx } : {}),
  };
  return JSON.stringify(entry);
}

export const logger = {
  debug(msg: string, ctx: LogContext = {}) {
    if (!shouldLog('debug')) return;
    const formatted = formatMessage('debug', msg, ctx);
    if (IS_DEV) console.log(`[DEBUG] ${msg}`, ctx);
    console.debug(formatted);
  },

  info(msg: string, ctx: LogContext = {}) {
    if (!shouldLog('info')) return;
    const formatted = formatMessage('info', msg, ctx);
    if (IS_DEV) console.log(`[INFO] ${msg}`, ctx);
    console.info(formatted);
  },

  warn(msg: string, ctx: LogContext = {}) {
    if (!shouldLog('warn')) return;
    const formatted = formatMessage('warn', msg, ctx);
    if (IS_DEV) console.log(`[WARN] ${msg}`, ctx);
    console.warn(formatted);
  },

  error(msg: string, ctx: LogContext = {}) {
    if (!shouldLog('error')) return;
    const formatted = formatMessage('error', msg, ctx);
    if (IS_DEV) console.log(`[ERROR] ${msg}`, ctx);
    console.error(formatted);
  },
};

export default logger;
