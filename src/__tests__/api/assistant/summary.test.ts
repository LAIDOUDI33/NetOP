import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/assistant/summary/route';
import { db } from '@/lib/db';

const mockDb = db as any;

// subscriberSegment not in global mock
beforeEach(() => {
  if (!mockDb.subscriberSegment) {
    mockDb.subscriberSegment = { findMany: vi.fn().mockResolvedValue([]) };
  }
});

describe('GET /api/assistant/summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (!mockDb.subscriberSegment) {
      mockDb.subscriberSegment = { findMany: vi.fn().mockResolvedValue([]) };
    }
  });

  it('returns complete network summary', async () => {
    const req = new Request('http://localhost/api/assistant/summary');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.sites).toBeDefined();
    expect(data.sites.total).toBeDefined();
    expect(data.sites.byTech).toBeDefined();
    expect(data.sites.byStatus).toBeDefined();
    expect(data.alerts).toBeDefined();
    expect(data.alerts.active).toBeDefined();
    expect(data.alerts.critical).toBeDefined();
    expect(data.kpis).toBeDefined();
    expect(data.kpis.avgRsrp).toBeDefined();
    expect(data.kpis.avgThroughput).toBeDefined();
    expect(data.kpis.avgAvailability).toBeDefined();
    expect(data.predictions).toBeDefined();
    expect(data.anomalies).toBeDefined();
    expect(data.capacity).toBeDefined();
    expect(data.subscriberSegments).toBeDefined();
  });

  it('returns correct structure with zero data', async () => {
    // all mocks return empty / 0 by default
    const req = new Request('http://localhost/api/assistant/summary');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.sites.total).toBe(0);
    expect(data.alerts.active).toBe(0);
    expect(data.predictions.highRiskCapacity).toBe(0);
  });

  it('returns 500 on database error', async () => {
    mockDb.networkSite.count.mockRejectedValueOnce(new Error('Connection lost'));

    const req = new Request('http://localhost/api/assistant/summary');
    const res = await GET(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});
