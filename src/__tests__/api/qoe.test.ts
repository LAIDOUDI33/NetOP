import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/qoe/route';
import { db } from '@/lib/db';

const mockDb = db as any;

describe('GET /api/qoe (summary mode)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns summary mode by default', async () => {
    mockDb.networkSite.findMany.mockResolvedValueOnce([]);

    const req = new Request('http://localhost/api/qoe');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.mode).toBe('summary');
    expect(data.sites).toBeInstanceOf(Array);
    expect(data.summary).toBeDefined();
    expect(data.summary.totalSites).toBe(0);
    expect(data.summary.avgMosByTech).toBeDefined();
  });

  it('returns site summaries with QoE data', async () => {
    mockDb.networkSite.findMany.mockResolvedValueOnce([
      {
        id: 's1', name: 'Site A', code: 'SA', technology: '4G', region: 'Algiers',
        qoeMetrics: [{
          siteId: 's1', mosScore: 4.1, dataRateExperienced: 45, callSetupTime: 1.2,
          callDropRate: 0.1, webPageLoadTime: 0.5, videoStartTime: 2.1,
          pingLatency: 18, jitterExperience: 5, satisfactionIndex: 82,
          subscriberCount: 500, complaintCount: 3, timestamp: new Date(),
        }],
      },
    ]);

    const req = new Request('http://localhost/api/qoe');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.mode).toBe('summary');
    expect(data.sites).toHaveLength(1);
    expect(data.sites[0].mosScore).toBe(4.1);
    expect(data.summary.totalSites).toBe(1);
    expect(data.summary.avgMosByTech['4G']).toBe(4.1);
  });

  it('returns timeline mode for specific siteId', async () => {
    mockDb.qoEMetric = { findMany: vi.fn().mockResolvedValueOnce([]) };
    mockDb.networkSite.findUnique.mockResolvedValueOnce({
      id: 's1', name: 'Site A', code: 'SA', technology: '4G', region: 'Algiers',
    });

    const req = new Request('http://localhost/api/qoe?siteId=s1');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.mode).toBe('timeline');
    expect(data.site).toBeDefined();
    expect(data.timeline).toBeInstanceOf(Array);
    expect(data.from).toBeDefined();
    expect(data.to).toBeDefined();
  });

  it('returns 500 on error', async () => {
    mockDb.networkSite.findMany.mockRejectedValueOnce(new Error('DB fail'));

    const req = new Request('http://localhost/api/qoe');
    const res = await GET(req as any);

    expect(res.status).toBe(500);
  });
});
