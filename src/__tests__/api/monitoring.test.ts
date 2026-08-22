import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db');
vi.mock('@/lib/rate-limit');
vi.mock('@/lib/api-auth');
vi.mock('@/lib/cache-helper');
vi.mock('@/lib/demo-time');

import { GET } from '@/app/api/monitoring/route';
import { db } from '@/lib/db';

const mockDb = db as any;

const now = new Date('2025-01-15T12:00:00.000Z');

function makeSiteWithKpi(overrides: Record<string, any> = {}) {
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
    kpiMetrics: [{
      rsrp: -85, rssi: -70, sinr: 12,
      downloadThroughput: 45.5, uploadThroughput: 15.2,
      latency: 12, availability: 99.5, activeUsers: 120,
      handoverSuccessRate: 98.2, dropRate: 0.3, prbUtilization: 65,
    }],
    ...overrides,
  };
}

function makeTrendKpi(hoursAgo: number) {
  const ts = new Date(now.getTime() - hoursAgo * 3600000);
  return {
    id: `kpi-${hoursAgo}`,
    technology: '4G',
    timestamp: ts,
    rsrp: -85 - hoursAgo,
    rssi: -70 - hoursAgo,
    sinr: 12 - hoursAgo,
    downloadThroughput: 45 - hoursAgo * 2,
    uploadThroughput: 15 - hoursAgo,
    latency: 10 + hoursAgo,
    activeUsers: 100 + hoursAgo * 5,
    availability: 99 - hoursAgo * 0.5,
  };
}

describe('GET /api/monitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns sites, trend, and summary for default 4G', async () => {
    mockDb.networkSite.findMany.mockResolvedValue([
      makeSiteWithKpi(),
    ]);
    mockDb.kpiMetric.findMany.mockResolvedValue([
      makeTrendKpi(1),
      makeTrendKpi(2),
    ]);

    const req = new Request('http://localhost/api/monitoring');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.sites).toHaveLength(1);
    expect(data.sites[0].siteId).toBe('site-1');
    expect(data.sites[0].siteName).toBe('Site A');
    expect(data.sites[0].avgRsrp).toBe(-85);
    expect(data.sites[0].avgDownloadThroughput).toBe(45.5);
    expect(data.trend).toBeDefined();
    expect(data.trend.timestamps).toBeDefined();
    expect(data.trend.metrics).toBeDefined();
    expect(data.trend.metrics.rsrp).toBeDefined();
    expect(data.summary).toBeDefined();
    expect(data.summary.totalSites).toBe(1);
    expect(data.summary.activeSites).toBe(1);
  });

  it('filters by technology query parameter', async () => {
    mockDb.networkSite.findMany.mockResolvedValue([]);
    mockDb.kpiMetric.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/monitoring?technology=5G');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockDb.networkSite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { technology: '5G' } }),
    );
    expect(mockDb.kpiMetric.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ technology: '5G' }) }),
    );
  });

  it('handles site with no KPI metrics', async () => {
    mockDb.networkSite.findMany.mockResolvedValue([
      makeSiteWithKpi({ kpiMetrics: [] }),
    ]);
    mockDb.kpiMetric.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/monitoring');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.sites[0].avgRsrp).toBeUndefined();
    expect(data.sites[0].avgDownloadThroughput).toBe(0);
  });

  it('handles empty results', async () => {
    mockDb.networkSite.findMany.mockResolvedValue([]);
    mockDb.kpiMetric.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/monitoring');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.sites).toHaveLength(0);
    expect(data.summary.totalSites).toBe(0);
    expect(data.trend.timestamps).toHaveLength(0);
  });

  it('aggregates trend data into hourly buckets', async () => {
    // Same hour, multiple KPIs should be averaged
    const sameHour = new Date(now.getTime());
    sameHour.setMinutes(0);
    mockDb.networkSite.findMany.mockResolvedValue([makeSiteWithKpi()]);
    mockDb.kpiMetric.findMany.mockResolvedValue([
      { ...makeTrendKpi(1), timestamp: sameHour, downloadThroughput: 40 },
      { ...makeTrendKpi(1), timestamp: new Date(sameHour.getTime() + 600000), downloadThroughput: 50 },
    ]);

    const req = new Request('http://localhost/api/monitoring');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    // Both KPIs are in same hour bucket, download should be average of 40 and 50 = 45
    expect(data.trend.metrics.download).toBeDefined();
  });

  it('returns 500 on error', async () => {
    const { cachedQuery } = await import('@/lib/cache-helper');
    vi.mocked(cachedQuery).mockRejectedValueOnce(new Error('DB error'));

    const req = new Request('http://localhost/api/monitoring');
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});
