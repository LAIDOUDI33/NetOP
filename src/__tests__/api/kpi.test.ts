import { describe, it, expect, vi, beforeEach } from 'vitest';


import { GET } from '@/app/api/kpi/route';
import { db } from '@/lib/db';

const mockDb = db as any;

const now = new Date('2025-01-15T12:00:00.000Z');

function makeKpiMetric(overrides: Record<string, any> = {}) {
  return {
    id: 'kpi-1',
    timestamp: now,
    technology: '4G',
    siteId: 'site-1',
    downloadThroughput: 45.5,
    uploadThroughput: 15.2,
    latency: 12,
    availability: 99.5,
    rsrp: -85,
    rssi: -70,
    sinr: 12,
    dropRate: 0.3,
    handoverSuccessRate: 98.2,
    prbUtilization: 65,
    activeUsers: 120,
    ...overrides,
  };
}

function makeSite(overrides: Record<string, any> = {}) {
  return {
    id: 'site-1',
    name: 'Site A',
    code: 'SITE-A',
    technology: '4G',
    region: 'Algiers',
    status: 'active',
    kpiMetrics: [{ downloadThroughput: 45.5 }],
    ...overrides,
  };
}

describe('GET /api/kpi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns KPI data with default metric', async () => {
    mockDb.kpiMetric.findMany.mockResolvedValue([
      makeKpiMetric(),
    ]);
    mockDb.networkSite.findMany.mockResolvedValue([
      makeSite(),
    ]);

    const req = new Request('http://localhost/api/kpi');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.metric).toBe('downloadThroughput');
    expect(data.timestamps).toBeDefined();
    expect(data.data).toBeDefined();
    expect(data.siteData).toBeDefined();
    expect(data.technologies).toContain('4G');
  });

  it('returns 400 for invalid metric', async () => {
    const req = new Request('http://localhost/api/kpi?metric=invalidMetric');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Invalid metric');
  });

  it('accepts all valid metrics', async () => {
    const validMetrics = [
      'rssi', 'rsrp', 'rsrq', 'sinr', 'downloadThroughput',
      'uploadThroughput', 'latency', 'availability', 'dropRate',
      'handoverSuccessRate', 'prbUtilization', 'activeUsers',
      'packetLoss', 'jitter', 'blockedCallRate',
    ];

    for (const metric of validMetrics) {
      mockDb.kpiMetric.findMany.mockResolvedValue([
        makeKpiMetric({ [metric]: 42 }),
      ]);
      mockDb.networkSite.findMany.mockResolvedValue([]);

      const req = new Request(`http://localhost/api/kpi?metric=${metric}`);
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.metric).toBe(metric);

      vi.clearAllMocks();
    }
  });

  it('filters by technology', async () => {
    mockDb.kpiMetric.findMany.mockResolvedValue([
      makeKpiMetric({ technology: '3G' }),
    ]);
    mockDb.networkSite.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/kpi?technology=3G');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockDb.kpiMetric.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ technology: '3G' }),
      }),
    );
    expect(mockDb.networkSite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { technology: '3G' },
      }),
    );
  });

  it('does not filter technology when "all"', async () => {
    mockDb.kpiMetric.findMany.mockResolvedValue([]);
    mockDb.networkSite.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/kpi?technology=all');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const kpiCall = mockDb.kpiMetric.findMany.mock.calls[0][0];
    expect(kpiCall.where.technology).toBeUndefined();
  });

  it('handles empty KPI data', async () => {
    mockDb.kpiMetric.findMany.mockResolvedValue([]);
    mockDb.networkSite.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/kpi');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.timestamps).toHaveLength(0);
    expect(data.technologies).toHaveLength(0);
    expect(data.siteData).toHaveLength(0);
  });

  it('groups data by technology', async () => {
    mockDb.kpiMetric.findMany.mockResolvedValue([
      makeKpiMetric({ technology: '4G', downloadThroughput: 40 }),
      makeKpiMetric({ technology: '3G', downloadThroughput: 20, timestamp: new Date(now.getTime() + 60000) }),
    ]);
    mockDb.networkSite.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/kpi');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.technologies).toContain('4G');
    expect(data.technologies).toContain('3G');
    expect(data.data['4G']).toBeDefined();
    expect(data.data['3G']).toBeDefined();
  });

  it('returns 500 on database error', async () => {
    mockDb.kpiMetric.findMany.mockRejectedValue(new Error('Connection failed'));

    const req = new Request('http://localhost/api/kpi');
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});
