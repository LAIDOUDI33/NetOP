import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '@/lib/logger';

// Spy on console methods
describe('logger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('info', () => {
    it('logs info message in dev mode', () => {
      logger.info('Test message');
      expect(console.info).toHaveBeenCalled();
    });

    it('includes context when provided', () => {
      logger.info('Test message', { key: 'value' });
      expect(console.info).toHaveBeenCalled();
      const call = (console.info as any).mock.calls[0][0];
      const parsed = JSON.parse(call);
      expect(parsed.level).toBe('info');
      expect(parsed.message).toBe('Test message');
      expect(parsed.context).toEqual({ key: 'value' });
    });

    it('does not include context key when empty', () => {
      logger.info('No context');
      const call = (console.info as any).mock.calls[0][0];
      const parsed = JSON.parse(call);
      expect(parsed.context).toBeUndefined();
    });
  });

  describe('warn', () => {
    it('logs warn message', () => {
      logger.warn('Warning');
      expect(console.warn).toHaveBeenCalled();
      const call = (console.warn as any).mock.calls[0][0];
      const parsed = JSON.parse(call);
      expect(parsed.level).toBe('warn');
    });
  });

  describe('error', () => {
    it('logs error message', () => {
      logger.error('Error occurred');
      expect(console.error).toHaveBeenCalled();
      const call = (console.error as any).mock.calls[0][0];
      const parsed = JSON.parse(call);
      expect(parsed.level).toBe('error');
    });
  });

  describe('debug', () => {
    it('does not log when LOG_LEVEL is info (default)', () => {
      // Default LOG_LEVEL is 'info', so debug should be suppressed
      logger.debug('Should not appear');
      // console.debug should NOT have been called because shouldLog returns false
      expect(console.debug).not.toHaveBeenCalled();
    });
  });

  describe('format', () => {
    it('includes timestamp', () => {
      logger.info('timestamped');
      const call = (console.info as any).mock.calls[0][0];
      const parsed = JSON.parse(call);
      expect(parsed.timestamp).toBeDefined();
      expect(typeof parsed.timestamp).toBe('string');
      // Should be a valid ISO string
      expect(new Date(parsed.timestamp).getTime()).not.toBeNaN();
    });
  });
});
