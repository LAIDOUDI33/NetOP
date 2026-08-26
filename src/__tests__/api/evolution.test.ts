import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/evolution/route';
import { db } from '@/lib/db';

const mockDb = db as any;

// evolutionPlan not in global mock
beforeEach(() => {
  mockDb.evolutionPlan = { findMany: vi.fn().mockResolvedValue([]) };
});

describe('GET /api/evolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.evolutionPlan = { findMany: vi.fn().mockResolvedValue([]) };
  });

  it('returns empty plans with default summary', async () => {
    const req = new Request('http://localhost/api/evolution');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.plans).toEqual([]);
    expect(data.summary.total).toBe(0);
    expect(data.summary.completionPct).toBe(0);
  });

  it('returns mapped plans with computed summary', async () => {
    mockDb.evolutionPlan.findMany.mockResolvedValueOnce([
      {
        id: 'ep-1', name: '3G to 4G Migration', sourceTech: '3G', targetTech: '4G',
        region: 'Algiers', siteCount: 50, sitesCompleted: 30, estimatedCost: 5000000,
        spentBudget: 3000000, startDate: new Date('2024-01-01'), targetDate: new Date('2025-06-01'),
        status: 'in_progress', spectrumGain: '{"gain":10}', capacityGain: '{"gain":2}',
        riskLevel: 'medium', notes: '', createdAt: new Date(), updatedAt: new Date(),
      },
    ]);

    const req = new Request('http://localhost/api/evolution');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.plans).toHaveLength(1);
    expect(data.summary.total).toBe(1);
    expect(data.summary.totalSites).toBe(50);
    expect(data.summary.totalCompleted).toBe(30);
    expect(data.summary.completionPct).toBe(60);
    expect(data.summary.bySourceTech['3G']).toBe(1);
  });

  it('filters by source and target tech', async () => {
    mockDb.evolutionPlan.findMany.mockResolvedValueOnce([]);

    const req = new Request('http://localhost/api/evolution?sourceTech=3G&targetTech=4G');
    const res = await GET(req as any);

    expect(res.status).toBe(200);
    expect(mockDb.evolutionPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { sourceTech: '3G', targetTech: '4G' } }),
    );
  });

  it('returns 500 on error', async () => {
    mockDb.evolutionPlan.findMany.mockRejectedValueOnce(new Error('DB fail'));

    const req = new Request('http://localhost/api/evolution');
    const res = await GET(req as any);

    expect(res.status).toBe(500);
  });
});
