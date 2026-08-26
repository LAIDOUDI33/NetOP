import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/coverage-holes/route';
import { db } from '@/lib/db';

const mockDb = db as any;

// coverageHole not in global mock — add locally
beforeEach(() => {
  mockDb.coverageHole = {
    findMany: vi.fn().mockResolvedValue([]),
  };
});

describe('GET /api/coverage-holes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.coverageHole = { findMany: vi.fn().mockResolvedValue([]) };
  });

  it('returns empty holes and summary', async () => {
    const req = Object.assign(new Request('http://localhost/api/coverage-holes'), { nextUrl: new URL('http://localhost/api/coverage-holes') }) as any;
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.holes).toEqual([]);
    expect(data.summary.total).toBe(0);
    expect(data.summary.bySeverity).toEqual({});
    expect(data.summary.avgGapDb).toBe(0);
  });

  it('returns mapped holes with summary when data exists', async () => {
    mockDb.coverageHole.findMany.mockResolvedValueOnce([
      {
        id: 'ch-1', technology: '4G', region: 'Algiers', latitude: 36.75, longitude: 3.06,
        radiusMeters: 500, areaKm2: 0.8, signalStrength: -110, expectedSignal: -85,
        gapDb: 25, severity: 'critical', nearestSite: 'site-1', nearestSiteName: 'Site A',
        nearestSiteDistKm: 2.5, affectedUsers: 350, recommendation: 'Add new site',
        status: 'open', createdAt: new Date(), updatedAt: new Date(),
      },
    ]);

    const req = Object.assign(new Request('http://localhost/api/coverage-holes'), { nextUrl: new URL('http://localhost/api/coverage-holes') }) as any;
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.holes).toHaveLength(1);
    expect(data.summary.total).toBe(1);
    expect(data.summary.totalAffectedUsers).toBe(350);
    expect(data.summary.avgGapDb).toBe(25);
    expect(data.summary.bySeverity.critical).toBe(1);
  });

  it('filters by technology and severity', async () => {
    mockDb.coverageHole.findMany.mockResolvedValueOnce([]);

    const req = Object.assign(new Request('http://localhost/api/coverage-holes?technology=5G&severity=critical'), { nextUrl: new URL('http://localhost/api/coverage-holes?technology=5G&severity=critical') }) as any;
    const res = await GET(req as any);

    expect(res.status).toBe(200);
    expect(mockDb.coverageHole.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { technology: '5G', severity: 'critical' } }),
    );
  });

  it('returns 500 on error', async () => {
    mockDb.coverageHole.findMany.mockRejectedValueOnce(new Error('DB fail'));

    const req = Object.assign(new Request('http://localhost/api/coverage-holes'), { nextUrl: new URL('http://localhost/api/coverage-holes') }) as any;
    const res = await GET(req as any);

    expect(res.status).toBe(500);
  });
});
