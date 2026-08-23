import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockDb, makeNextRequest } from './mock-db';

const { mockDb } = vi.hoisted(() => ({ mockDb: createMockDb() }));
vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/demo-time', () => ({
  demoHoursAgo: vi.fn().mockResolvedValue(new Date('2025-01-15T06:00:00.000Z')),
}));

import { GET, POST } from '@/app/api/optimizer/route';

describe('GET /api/optimizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with optimizations and healthSummary', async () => {
    const res = await GET(makeNextRequest('/api/optimizer'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('optimizations');
    expect(body).toHaveProperty('healthSummary');
    expect(Array.isArray(body.optimizations)).toBe(true);
    expect(Array.isArray(body.healthSummary)).toBe(true);
  });

  it('queries optimizationLog for recent optimizations', async () => {
    await GET(makeNextRequest('/api/optimizer'));
    expect(mockDb.optimizationLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    );
  });

  it('queries networkSite for site info', async () => {
    await GET(makeNextRequest('/api/optimizer'));
    expect(mockDb.networkSite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 1000 }),
    );
  });

  it('queries kpiMetric with groupBy for health summary', async () => {
    await GET(makeNextRequest('/api/optimizer'));
    expect(mockDb.kpiMetric.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['technology'],
        _avg: expect.objectContaining({
          downloadThroughput: true,
          latency: true,
          availability: true,
        }),
      }),
    );
  });
});

describe('POST /api/optimizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for missing prompt', async () => {
    const res = await POST(
      makeNextRequest('/api/optimizer', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
  });

  it('returns 400 for empty string prompt', async () => {
    const res = await POST(
      makeNextRequest('/api/optimizer', {
        method: 'POST',
        body: JSON.stringify({ prompt: '' }),
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(res.status).toBe(400);
  });
});
