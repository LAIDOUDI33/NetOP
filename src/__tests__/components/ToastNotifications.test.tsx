import { describe, it, expect } from 'vitest';
import { toast } from 'sonner';

describe('Toast Notifications (sonner)', () => {
  it('toast is a function', () => {
    expect(typeof toast).toBe('function');
  });

  it('toast.success is a function', () => {
    expect(typeof toast.success).toBe('function');
  });

  it('toast.error is a function', () => {
    expect(typeof toast.error).toBe('function');
  });

  it('toast.warning is a function', () => {
    expect(typeof toast.warning).toBe('function');
  });

  it('toast.info is a function', () => {
    expect(typeof toast.info).toBe('function');
  });

  it('toast can be called without throwing', () => {
    expect(() => toast('smoke test')).not.toThrow();
  });
});
