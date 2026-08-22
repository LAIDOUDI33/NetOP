import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Must come before imports that use the mocked modules
vi.mock('@/lib/db');
vi.mock('@/lib/rate-limit');
vi.mock('@/lib/api-auth');
vi.mock('@/lib/demo-time');

import { GET } from '@/app/api/health-check/route';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

const mockDb = db as any;

describe('GET /api/health-check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 200 healthy when database is reachable', async () => {
    mockDb.$queryRaw.mockResolvedValue([{ '1': 1 }]);

    const req = new Request('http://localhost/api/health-check');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.timestamp).toBeDefined();
    expect(data.version).toBeDefined();
    expect(data.uptime_ms).toBeGreaterThanOrEqual(0);
    expect(data.services).toBeDefined();
    expect(data.services.api).toBe('ok');
    expect(data.services.database).toBe('ok');
    expect(data.services.db_latency_ms).toBeGreaterThanOrEqual(0);
  });

  it('returns 503 unhealthy when database query fails', async () => {
    mockDb.$queryRaw.mockRejectedValue(new Error('Connection refused'));

    const req = new Request('http://localhost/api/health-check');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.status).toBe('unhealthy');
    expect(data.services.database).toBe('down');
  });

  it('sets Cache-Control: no-store header', async () => {
    mockDb.$queryRaw.mockResolvedValue([{ '1': 1 }]);

    const req = new Request('http://localhost/api/health-check');
    const res = await GET(req);

    expect(res.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate');
  });

  it('returns version from npm_package_version env or fallback', async () => {
    mockDb.$queryRaw.mockResolvedValue([{ '1': 1 }]);

    const req = new Request('http://localhost/api/health-check');
    const res = await GET(req);
    const data = await res.json();

    // Either the env version or the fallback '0.2.0'
    expect(['0.2.0', undefined]).toContain(process.env.npm_package_version);
    expect(data.version).toBeDefined();
    expect(typeof data.version).toBe('string');
  });

  it('measures database latency', async () => {
    mockDb.$queryRaw.mockImplementation(async () => {
      // Simulate some latency
      await new Promise(r => setTimeout(r, 5));
      return [{ '1': 1 }];
    });

    const req = new Request('http://localhost/api/health-check');
    const res = await GET(req);
    const data = await res.json();

    expect(typeof data.services.db_latency_ms).toBe('number');
  });

  it('returns auth error when checkApiAuth throws', async () => {
    // Re-mock api-auth to throw
    const { checkApiAuth } = await import('@/lib/api-auth');
    vi.mocked(checkApiAuth).mockRejectedValue(new Error('UNAUTHENTICATED'));

    const req = new Request('http://localhost/api/health-check');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('returns rate limit response when limited', async () => {
    vi.mocked(rateLimit).mockReturnValue({ limited: true, resetMs: 5000 });

    const req = new Request('http://localhost/api/health-check');
    const res = await GET(req);

    expect(res.status).toBe(429);
  });
});
