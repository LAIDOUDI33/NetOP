import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use REAL implementation, not the global mock from vitest.setup.ts
vi.mock('@/lib/rate-limit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/rate-limit')>();
  return actual;
});

import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

/** Helper to create a fake request with a unique IP */
function makeRequest(ip: string): Request {
  return new Request('http://localhost/api/test', {
    headers: { 'x-forwarded-for': ip },
  });
}

describe('rate-limit', () => {
  describe('rateLimit', () => {
    it('returns { limited: false } under the max', () => {
      const req = makeRequest('10.0.0.1');
      const result = rateLimit(req, { windowMs: 60_000, max: 5 });
      expect(result.limited).toBe(false);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
      expect(result.resetMs).toBeGreaterThan(0);
    });

    it('allows multiple requests up to the max', () => {
      const ip = '10.0.1.1';
      for (let i = 0; i < 3; i++) {
        const result = rateLimit(makeRequest(ip), { windowMs: 60_000, max: 3 });
        expect(result.limited).toBe(false);
      }
      // 4th should be limited
      const result = rateLimit(makeRequest(ip), { windowMs: 60_000, max: 3 });
      expect(result.limited).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it('returns { limited: true, resetMs } when exceeded', () => {
      const ip = '10.0.2.1';
      const max = 2;
      for (let i = 0; i < max; i++) {
        rateLimit(makeRequest(ip), { windowMs: 60_000, max });
      }
      const result = rateLimit(makeRequest(ip), { windowMs: 60_000, max });
      expect(result.limited).toBe(true);
      expect(result.remaining).toBe(0);
      expect(result.resetMs).toBeGreaterThan(0);
    });

    it('uses explicit key when provided', () => {
      const req1 = makeRequest('10.0.3.1');
      const req2 = makeRequest('10.0.3.2');

      const r1 = rateLimit(req1, { windowMs: 60_000, max: 1, key: 'shared-key-unique-1' });
      expect(r1.limited).toBe(false);

      // Second request with different IP but same key should be limited
      const r2 = rateLimit(req2, { windowMs: 60_000, max: 1, key: 'shared-key-unique-1' });
      expect(r2.limited).toBe(true);
    });

    it('tracks different IPs independently', () => {
      const reqA = makeRequest('10.0.4.1');
      const reqB = makeRequest('10.0.4.2');

      const rA = rateLimit(reqA, { windowMs: 60_000, max: 1 });
      expect(rA.limited).toBe(false);

      const rB = rateLimit(reqB, { windowMs: 60_000, max: 1 });
      expect(rB.limited).toBe(false);
    });
  });

  describe('rateLimitResponse', () => {
    it('returns proper 429 response', async () => {
      const response = rateLimitResponse(5000);
      expect(response.status).toBe(429);

      const body = await response.json();
      expect(body).toEqual({
        error: 'Trop de requêtes',
        code: 'RATE_LIMITED',
        retry_after_ms: 5000,
      });

      expect(response.headers.get('content-type')).toBe('application/json');
      expect(response.headers.get('retry-after')).toBe('5');
      expect(response.headers.get('x-ratelimit-reset')).toBe('5000');
    });
  });
});
