import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeNextRequest } from './mock-db';

const { mockDb } = vi.hoisted(() => {
  const NOW = new Date('2025-01-15T12:00:00.000Z');
  const fm = vi.fn().mockResolvedValue([]);
  return {
    mockDb: {
      kpiMetric: { findMany: fm, groupBy: fm, aggregate: vi.fn().mockResolvedValue({ _max: { timestamp: NOW } }) },
      networkSite: { findMany: fm, findUnique: vi.fn().mockResolvedValue(null) },
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
      $executeRaw: vi.fn(), $on: vi.fn(), $connect: vi.fn(), $disconnect: vi.fn(),
    },
  };
});
vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/demo-time', () => ({
  demoHoursAgo: vi.fn().mockResolvedValue(new Date('2025-01-15T06:00:00.000Z')),
}));

import { GET } from '@/app/api/kpi/route';

describe('GET /api/kpi', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 200 with timeseries data structure', async () => {
    const res = await GET(makeNextRequest('/api/kpi'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('timestamps');
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('siteData');
    expect(body).toHaveProperty('metric');
    expect(body).toHaveProperty('technologies');
    expect(Array.isArray(body.timestamps)).toBe(true);
    expect(Array.isArray(body.siteData)).toBe(true);
  });

  it('defaults to downloadThroughput metric', async () => {
    const res = await GET(makeNextRequest('/api/kpi'));
    expect((await res.json()).metric).toBe('downloadThroughput');
  });

  it('uses specified metric parameter', async () => {
    const res = await GET(makeNextRequest('/api/kpi?metric=latency'));
    expect((await res.json()).metric).toBe('latency');
  });

  it('returns 400 for invalid metric', async () => {
    const res = await GET(makeNextRequest('/api/kpi?metric=invalidMetric'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid metric');
  });

  it('passes technology filter to kpiMetric query', async () => {
    await GET(makeNextRequest('/api/kpi?technology=4G'));
    expect(mockDb.kpiMetric.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ technology: '4G' }) }),
    );
  });

  it('passes technology filter to networkSite query', async () => {
    await GET(makeNextRequest('/api/kpi?technology=3G'));
    expect(mockDb.networkSite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ technology: '3G' }) }),
    );
  });

  it('returns empty timestamps and data for empty KPI results', async () => {
    const res = await GET(makeNextRequest('/api/kpi'));
    const body = await res.json();
    expect(body.timestamps).toEqual([]);
    expect(Object.keys(body.data)).toEqual([]);
  });
});
