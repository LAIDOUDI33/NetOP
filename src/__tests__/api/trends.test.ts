import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/trends/route';
import { db } from '@/lib/db';

const mockDb = db as any;

// trendForecast not in global mock
beforeEach(() => {
  mockDb.trendForecast = { findMany: vi.fn().mockResolvedValue([]) };
});

describe('GET /api/trends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.trendForecast = { findMany: vi.fn().mockResolvedValue([]) };
  });

  it('returns empty trends with default summary', async () => {
    const req = new Request('http://localhost/api/trends');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.trends).toEqual([]);
    expect(data.summary.total).toBe(0);
    expect(data.summary.avgConfidence).toBe(0);
  });

  it('returns mapped trends with computed summary', async () => {
    mockDb.trendForecast.findMany.mockResolvedValueOnce([
      {
        id: 'tf-1', siteId: 'site-1', technology: '4G', region: 'Algiers',
        metric: 'RSRP', forecastPoints: '[{"x":1,"y":-85}]', horizon: '30d',
        trendDirection: 'degrading', confidence: 0.85, recommendation: 'Check antenna',
        timestamp: new Date(), createdAt: new Date(),
        site: { name: 'Site A', code: 'SITE-A', technology: '4G', region: 'Algiers' },
      },
    ]);

    const req = new Request('http://localhost/api/trends');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.trends).toHaveLength(1);
    expect(data.summary.total).toBe(1);
    expect(data.summary.avgConfidence).toBe(0.85);
    expect(data.summary.byDirection.degrading).toBe(1);
  });

  it('filters by technology and metric', async () => {
    mockDb.trendForecast.findMany.mockResolvedValueOnce([]);

    const req = new Request('http://localhost/api/trends?technology=5G&metric=RSRP');
    const res = await GET(req as any);

    expect(res.status).toBe(200);
    expect(mockDb.trendForecast.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { technology: '5G', metric: 'RSRP' } }),
    );
  });

  it('returns 500 on error', async () => {
    mockDb.trendForecast.findMany.mockRejectedValueOnce(new Error('DB fail'));

    const req = new Request('http://localhost/api/trends');
    const res = await GET(req as any);

    expect(res.status).toBe(500);
  });
});
