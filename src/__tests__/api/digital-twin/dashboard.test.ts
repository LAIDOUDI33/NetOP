import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/digital-twin/dashboard/route';
import { db } from '@/lib/db';

const mockDb = db as any;

describe('GET /api/digital-twin/dashboard', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns dashboard with empty scenarios', async () => {
    const req = new Request('http://localhost/api/digital-twin/dashboard');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.totalScenarios).toBe(0);
    expect(data.byType).toEqual({});
    expect(data.byStatus).toEqual({});
    expect(data.avgImpactScore).toBe(0);
    expect(data.recentScenarios).toEqual([]);
  });

  it('returns dashboard with scenario data', async () => {
    mockDb.digitalTwinScenario.count.mockResolvedValueOnce(5);
    mockDb.digitalTwinScenario.findMany.mockResolvedValueOnce([
      { id: 'ds-1', name: 'Disaster Sim', scenarioType: 'disaster', status: 'simulated', impactScore: 45, createdAt: new Date() },
      { id: 'ds-2', name: 'Capacity Grow', scenarioType: 'capacity_expansion', status: 'draft', impactScore: 30, createdAt: new Date() },
    ]);
    mockDb.digitalTwinScenario.groupBy
      .mockResolvedValueOnce([{ scenarioType: 'disaster', _count: { id: 3 } }])
      .mockResolvedValueOnce([{ status: 'simulated', _count: { id: 2 } }]);
    mockDb.digitalTwinScenario.aggregate.mockResolvedValueOnce({ _avg: { impactScore: 37.5 } });

    const req = new Request('http://localhost/api/digital-twin/dashboard');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.totalScenarios).toBe(5);
    expect(data.recentScenarios).toHaveLength(2);
    expect(data.avgImpactScore).toBe(37.5);
  });

  it('returns 500 on error', async () => {
    mockDb.digitalTwinScenario.count.mockRejectedValueOnce(new Error('DB fail'));

    const req = new Request('http://localhost/api/digital-twin/dashboard');
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});
