import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/handover/route';
import { db } from '@/lib/db';

const mockDb = db as any;

// handoverKpi not in global mock — add locally
beforeEach(() => {
  mockDb.handoverKpi = {
    findMany: vi.fn().mockResolvedValue([]),
  };
});

describe('GET /api/handover', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.handoverKpi = { findMany: vi.fn().mockResolvedValue([]) };
  });

  it('returns empty handovers with default summary', async () => {
    const req = new Request('http://localhost/api/handover');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.handovers).toEqual([]);
    expect(data.summary.total).toBe(0);
    expect(data.summary.avgSuccessRate).toBe(0);
    expect(data.summary.totalAttempts).toBe(0);
  });

  it('returns mapped handovers with computed summary', async () => {
    mockDb.handoverKpi.findMany.mockResolvedValueOnce([
      {
        id: 'ho-1', servingCellId: 'site-1', neighborCellName: 'Cell B', neighborCellCode: 'CELL-B',
        technology: '4G', relationType: 'intra', hoAttempts: 100, hoSuccess: 98, hoFailures: 2,
        hoSuccessRate: 98, avgPrepTime: 5, avgExecTime: 12, pingPongCount: 0,
        tooEarlyCount: 1, tooLateCount: 0, status: 'optimal', recommendation: 'none',
        timestamp: new Date(), createdAt: new Date(),
        servingCell: { name: 'Site A', code: 'SITE-A', region: 'Algiers' },
      },
    ]);

    const req = new Request('http://localhost/api/handover');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.handovers).toHaveLength(1);
    expect(data.summary.total).toBe(1);
    expect(data.summary.avgSuccessRate).toBe(98);
    expect(data.summary.totalAttempts).toBe(100);
    expect(data.summary.byStatus.optimal).toBe(1);
  });

  it('filters by technology param', async () => {
    mockDb.handoverKpi.findMany.mockResolvedValueOnce([]);

    const req = new Request('http://localhost/api/handover?technology=5G');
    const res = await GET(req as any);

    expect(res.status).toBe(200);
    expect(mockDb.handoverKpi.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { technology: '5G' } }),
    );
  });

  it('returns 500 on error', async () => {
    mockDb.handoverKpi.findMany.mockRejectedValueOnce(new Error('DB error'));

    const req = new Request('http://localhost/api/handover');
    const res = await GET(req as any);

    expect(res.status).toBe(500);
  });
});
