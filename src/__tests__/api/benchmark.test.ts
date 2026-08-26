import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/benchmark/route';
import { db } from '@/lib/db';

const mockDb = db as any;

// benchmarkRecord not in global mock
beforeEach(() => {
  mockDb.benchmarkRecord = { findMany: vi.fn().mockResolvedValue([]) };
});

describe('GET /api/benchmark', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.benchmarkRecord = { findMany: vi.fn().mockResolvedValue([]) };
  });

  it('returns empty benchmarks with default summary', async () => {
    const req = new Request('http://localhost/api/benchmark');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.benchmarks).toEqual([]);
    expect(data.summary.total).toBe(0);
    expect(data.summary.avgGap).toBe(0);
    expect(data.summary.aboveTarget).toBe(0);
  });

  it('returns mapped benchmarks with computed summary', async () => {
    mockDb.benchmarkRecord.findMany.mockResolvedValueOnce([
      {
        id: 'br-1', siteId: 'site-1', technology: '4G', region: 'Algiers',
        metric: 'RSRP', actualValue: -85, benchmarkValue: -80, targetValue: -82,
        percentileRank: 65, gap: 5, status: 'below_target',
        timestamp: new Date(), createdAt: new Date(),
        site: { name: 'Site A', code: 'SITE-A' },
      },
      {
        id: 'br-2', siteId: 'site-2', technology: '4G', region: 'Oran',
        metric: 'RSRP', actualValue: -78, benchmarkValue: -80, targetValue: -82,
        percentileRank: 85, gap: 4, status: 'above_target',
        timestamp: new Date(), createdAt: new Date(),
        site: { name: 'Site B', code: 'SITE-B' },
      },
    ]);

    const req = new Request('http://localhost/api/benchmark');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.benchmarks).toHaveLength(2);
    expect(data.summary.total).toBe(2);
    expect(data.summary.aboveTarget).toBe(1);
    expect(data.summary.avgGap).toBeCloseTo(4.5);
  });

  it('filters by technology and status', async () => {
    mockDb.benchmarkRecord.findMany.mockResolvedValueOnce([]);

    const req = new Request('http://localhost/api/benchmark?technology=5G&status=above_target');
    const res = await GET(req as any);

    expect(res.status).toBe(200);
    expect(mockDb.benchmarkRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { technology: '5G', status: 'above_target' } }),
    );
  });

  it('returns 500 on error', async () => {
    mockDb.benchmarkRecord.findMany.mockRejectedValueOnce(new Error('DB fail'));

    const req = new Request('http://localhost/api/benchmark');
    const res = await GET(req as any);

    expect(res.status).toBe(500);
  });
});
