import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/load/route';
import { db } from '@/lib/db';

const mockDb = db as any;

describe('GET /api/load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty loads with default summary', async () => {
    mockDb.cellLoad.findMany.mockResolvedValueOnce([]);

    const req = new Request('http://localhost/api/load');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.loads).toEqual([]);
    expect(data.summary.total).toBe(0);
    expect(data.summary.avgPrbDown).toBe(0);
    expect(data.summary.byCongestion).toEqual({});
  });

  it('returns mapped loads with computed summary', async () => {
    mockDb.cellLoad.findMany.mockResolvedValueOnce([
      {
        id: 'cl-1', siteId: 'site-1', technology: '4G', region: 'Algiers',
        prbUtilDownlink: 75, prbUtilUplink: 40, activeUsers: 200, maxUsers: 400,
        userLoadPct: 50, throughputDown: 120, throughputUp: 35, balancedScore: 0.85,
        congestionLevel: 'medium', recommendation: 'Monitor',
        timestamp: new Date(), createdAt: new Date(),
        site: { name: 'Site A', code: 'SITE-A' },
      },
    ]);

    const req = new Request('http://localhost/api/load');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.loads).toHaveLength(1);
    expect(data.summary.total).toBe(1);
    expect(data.summary.avgPrbDown).toBe(75);
    expect(data.summary.totalUsers).toBe(200);
    expect(data.summary.byCongestion.medium).toBe(1);
  });

  it('counts congested sites in summary', async () => {
    mockDb.cellLoad.findMany.mockResolvedValueOnce([
      { id: 'c1', siteId: 's1', technology: '4G', region: 'A', prbUtilDownlink: 90, prbUtilUplink: 80, activeUsers: 350, maxUsers: 400, userLoadPct: 87, throughputDown: 200, throughputUp: 60, balancedScore: 0.4, congestionLevel: 'high', recommendation: '', timestamp: new Date(), createdAt: new Date(), site: { name: 'S', code: 'C' } },
      { id: 'c2', siteId: 's2', technology: '3G', region: 'B', prbUtilDownlink: 95, prbUtilUplink: 90, activeUsers: 395, maxUsers: 400, userLoadPct: 98, throughputDown: 50, throughputUp: 20, balancedScore: 0.2, congestionLevel: 'critical', recommendation: '', timestamp: new Date(), createdAt: new Date(), site: { name: 'S2', code: 'C2' } },
    ]);

    const req = new Request('http://localhost/api/load');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.summary.congestedSites).toBe(2);
  });

  it('filters by technology and region', async () => {
    mockDb.cellLoad.findMany.mockResolvedValueOnce([]);

    const req = new Request('http://localhost/api/load?technology=5G&region=Algiers');
    const res = await GET(req as any);

    expect(res.status).toBe(200);
    expect(mockDb.cellLoad.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { technology: '5G', region: 'Algiers' } }),
    );
  });

  it('returns 500 on error', async () => {
    mockDb.cellLoad.findMany.mockRejectedValueOnce(new Error('DB fail'));

    const req = new Request('http://localhost/api/load');
    const res = await GET(req as any);

    expect(res.status).toBe(500);
  });
});
