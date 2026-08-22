import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db');
vi.mock('@/lib/rate-limit');
vi.mock('@/lib/api-auth');
vi.mock('@/lib/cache-helper');
vi.mock('@/lib/demo-time');

import { GET } from '@/app/api/dashboard/route';
import { db } from '@/lib/db';

const mockDb = db as any;

const now = new Date('2025-01-15T12:00:00.000Z');

function makeSite(overrides: Record<string, any> = {}) {
  return {
    id: 'site-1',
    name: 'Site A',
    code: 'SITE-A',
    technology: '4G',
    status: 'active',
    region: 'Algiers',
    frequency: '2100',
    vendor: 'Ericsson',
    maxCapacity: 500,
    ...overrides,
  };
}

function makeKpiGroupBy(overrides: Record<string, any> = {}) {
  return {
    siteId: 'site-1',
    technology: '4G',
    _avg: {
      downloadThroughput: 45.5,
      uploadThroughput: 15.2,
      latency: 12.3,
      availability: 99.5,
      activeUsers: 120,
      handoverSuccessRate: 98.2,
      dropRate: 0.3,
      prbUtilization: 65,
      rsrp: -85,
      rssi: -70,
      sinr: 12,
    },
    ...overrides,
  };
}

function makeTrendKpi(hour: number) {
  const d = new Date(now.getTime());
  d.setHours(hour, 0, 0, 0);
  return {
    siteId: 'site-1',
    technology: '4G',
    timestamp: d,
    _avg: {
      downloadThroughput: 40 + hour,
      uploadThroughput: 10 + hour,
      latency: 10 + hour,
      activeUsers: 100 + hour * 10,
    },
  };
}

describe('GET /api/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns dashboard summary data', async () => {
    mockDb.networkSite.findMany.mockResolvedValue([
      makeSite(),
      makeSite({ id: 'site-2', technology: '3G', status: 'degraded' }),
    ]);
    mockDb.kpiMetric.groupBy
      .mockResolvedValueOnce([makeKpiGroupBy()]) // latestKpis
      .mockResolvedValueOnce([makeTrendKpi(6), makeTrendKpi(7), makeTrendKpi(8)]); // trendKpis
    mockDb.alert.count
      .mockResolvedValueOnce(5) // activeAlerts
      .mockResolvedValueOnce(12); // recentAlerts

    const req = new Request('http://localhost/api/dashboard');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.totalSites).toBe(2);
    expect(data.sitesByTech).toEqual({ '2G': 0, '3G': 1, '4G': 1, '5G': 0 });
    expect(data.sitesByStatus).toEqual({ active: 1, degraded: 1, down: 0, maintenance: 0 });
    expect(data.totalActiveUsers).toBeDefined();
    expect(data.avgThroughput).toBeDefined();
    expect(data.avgThroughput.download).toBeDefined();
    expect(data.avgThroughput.upload).toBeDefined();
    expect(data.avgLatency).toBeDefined();
    expect(data.avgAvailability).toBeDefined();
    expect(data.activeAlerts).toBe(5);
    expect(data.recentAlerts).toBe(12);
    expect(data.kpiTrends).toBeDefined();
    expect(data.kpiTrends.timestamps).toBeDefined();
    expect(data.techHealth).toBeDefined();
    expect(data.techHealth).toHaveLength(4);
  });

  it('handles empty sites', async () => {
    mockDb.networkSite.findMany.mockResolvedValue([]);
    mockDb.kpiMetric.groupBy
      .mockResolvedValueOnce([]) // latestKpis
      .mockResolvedValueOnce([]); // trendKpis
    mockDb.alert.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const req = new Request('http://localhost/api/dashboard');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.totalSites).toBe(0);
    expect(data.avgThroughput.download).toBe(0);
    expect(data.totalActiveUsers).toBe(0);
  });

  it('computes technology health correctly', async () => {
    mockDb.networkSite.findMany.mockResolvedValue([
      makeSite({ id: 's1', technology: '4G', status: 'active' }),
      makeSite({ id: 's2', technology: '4G', status: 'down' }),
      makeSite({ id: 's3', technology: '2G', status: 'active' }),
    ]);
    mockDb.kpiMetric.groupBy
      .mockResolvedValueOnce([
        makeKpiGroupBy({ technology: '4G' }),
        makeKpiGroupBy({ technology: '2G', _avg: { ...makeKpiGroupBy()._avg, availability: 98 } }),
      ])
      .mockResolvedValueOnce([]);
    mockDb.alert.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const req = new Request('http://localhost/api/dashboard');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    const health4G = data.techHealth.find((t: any) => t.technology === '4G');
    expect(health4G).toBeDefined();
    expect(health4G.sites).toBe(2);
    expect(health4G.activeSites).toBe(1);
  });

  it('returns 500 on error', async () => {
    const { cachedQuery } = await import('@/lib/cache-helper');
    vi.mocked(cachedQuery).mockRejectedValueOnce(new Error('DB failure'));

    const req = new Request('http://localhost/api/dashboard');
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});
