import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeNextRequest } from './mock-db';

const { mockDb } = vi.hoisted(() => {
  const fm = vi.fn().mockResolvedValue([]);
  const NOW = new Date('2025-01-15T12:00:00.000Z');
  return {
    mockDb: {
      networkSite: { findMany: fm, findUnique: vi.fn().mockResolvedValue(null) },
      kpiMetric: { findMany: fm, groupBy: fm, aggregate: vi.fn().mockResolvedValue({ _max: { timestamp: NOW } }) },
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
      $executeRaw: vi.fn(), $on: vi.fn(), $connect: vi.fn(), $disconnect: vi.fn(),
    },
  };
});
vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/demo-time', () => ({
  demoHoursAgo: vi.fn().mockResolvedValue(new Date('2025-01-15T06:00:00.000Z')),
}));

import { GET } from '@/app/api/monitoring/route';

describe('GET /api/monitoring', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 200 with sites, trend, and summary', async () => {
    const res = await GET(makeNextRequest('/api/monitoring'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('sites');
    expect(body).toHaveProperty('trend');
    expect(body).toHaveProperty('summary');
    expect(Array.isArray(body.sites)).toBe(true);
    expect(body.trend).toHaveProperty('timestamps');
    expect(body.trend).toHaveProperty('metrics');
    expect(body.summary).toHaveProperty('totalSites');
    expect(body.summary).toHaveProperty('activeSites');
  });

  it('defaults to 4G technology filter', async () => {
    await GET(makeNextRequest('/api/monitoring'));
    expect(mockDb.networkSite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { technology: '4G' } }),
    );
  });

  it('respects technology parameter', async () => {
    await GET(makeNextRequest('/api/monitoring?technology=3G'));
    expect(mockDb.networkSite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { technology: '3G' } }),
    );
  });

  it('includes KPI metrics in site query', async () => {
    await GET(makeNextRequest('/api/monitoring'));
    expect(mockDb.networkSite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: expect.objectContaining({ kpiMetrics: expect.any(Object) }) }),
    );
  });

  it('returns zero totalSites for empty results', async () => {
    const res = await GET(makeNextRequest('/api/monitoring'));
    const body = await res.json();
    expect(body.summary.totalSites).toBe(0);
    expect(body.summary.activeSites).toBe(0);
  });

  it('trend metrics contain expected keys', async () => {
    const res = await GET(makeNextRequest('/api/monitoring'));
    const body = await res.json();
    const metrics = body.trend.metrics;
    expect(metrics).toHaveProperty('rsrp');
    expect(metrics).toHaveProperty('sinr');
    expect(metrics).toHaveProperty('download');
    expect(metrics).toHaveProperty('upload');
    expect(metrics).toHaveProperty('latency');
    expect(metrics).toHaveProperty('users');
    expect(metrics).toHaveProperty('availability');
  });
});
