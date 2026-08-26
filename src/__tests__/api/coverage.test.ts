import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/coverage/route';
import { db } from '@/lib/db';

const mockDb = db as any;

function makeSite(overrides: Record<string, any> = {}) {
  return {
    id: 'site-1',
    name: 'Site A',
    code: 'SITE-A',
    technology: '4G',
    status: 'active',
    region: 'Algiers',
    latitude: 36.75,
    longitude: 3.06,
    frequency: '2100',
    bandwidth: 20,
    vendor: 'Ericsson',
    maxCapacity: 500,
    kpiMetrics: [],
    ...overrides,
  };
}

describe('GET /api/coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns sites and region stats', async () => {
    mockDb.networkSite.findMany.mockResolvedValueOnce([
      makeSite({ id: 's1', region: 'Algiers', kpiMetrics: [{ rsrp: -85, downloadThroughput: 45, activeUsers: 120, availability: 99.5 }] }),
      makeSite({ id: 's2', region: 'Oran', kpiMetrics: [{ rsrp: -90, downloadThroughput: 38, activeUsers: 80, availability: 98.2 }] }),
    ]);

    const req = new Request('http://localhost/api/coverage');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.sites).toHaveLength(2);
    expect(data.regionStats).toBeInstanceOf(Array);
    expect(data.regionStats.length).toBeGreaterThan(0);
    expect(data.sites[0].avgSignal).toBeDefined();
    expect(data.sites[0].avgThroughput).toBeDefined();
  });

  it('returns empty arrays for no sites', async () => {
    mockDb.networkSite.findMany.mockResolvedValueOnce([]);

    const req = new Request('http://localhost/api/coverage');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.sites).toEqual([]);
    expect(data.regionStats).toEqual([]);
  });

  it('filters by technology param', async () => {
    mockDb.networkSite.findMany.mockResolvedValueOnce([
      makeSite({ technology: '5G' }),
    ]);

    const req = new Request('http://localhost/api/coverage?technology=5G');
    const res = await GET(req as any);

    expect(res.status).toBe(200);
    expect(mockDb.networkSite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { technology: '5G' } }),
    );
  });

  it('returns 500 on error', async () => {
    mockDb.networkSite.findMany.mockRejectedValueOnce(new Error('DB crash'));

    const req = new Request('http://localhost/api/coverage');
    const res = await GET(req as any);

    expect(res.status).toBe(500);
  });
});
