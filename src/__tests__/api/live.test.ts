import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/live/route';
import { db } from '@/lib/db';

const mockDb = db as any;

describe('GET /api/live', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns live overview with all sections', async () => {
    const req = new Request('http://localhost/api/live');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.overview).toBeDefined();
    expect(data.overview.totalUsers).toBeDefined();
    expect(data.overview.totalDownloadMbps).toBeDefined();
    expect(data.overview.avgAvailability).toBeDefined();
    expect(data.overview.activeAlerts).toBeDefined();
    expect(data.overview.activeIncidents).toBeDefined();
    expect(data.byTech).toBeInstanceOf(Array);
    expect(data.topLoadedSites).toBeInstanceOf(Array);
    expect(data.recentAlerts).toBeInstanceOf(Array);
    expect(data.energySummary).toBeDefined();
    expect(data.incidentSummary).toBeDefined();
  });

  it('returns zeros when no data exists', async () => {
    // all mocks return empty / 0 by default
    const req = new Request('http://localhost/api/live');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.overview.totalUsers).toBe(0);
    expect(data.overview.activeAlerts).toBe(0);
    expect(data.energySummary.totalPowerKw).toBe(0);
  });

  it('returns 500 on error', async () => {
    mockDb.kpiMetric.findMany.mockRejectedValueOnce(new Error('DB fail'));

    const req = new Request('http://localhost/api/live');
    const res = await GET(req as any);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});
