import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db');
vi.mock('@/lib/rate-limit');
vi.mock('@/lib/api-auth');

import { GET } from '@/app/api/outages/route';
import { db } from '@/lib/db';

const mockDb = db as any;

const now = new Date('2025-01-15T12:00:00.000Z');

function makeOutage(overrides: Record<string, any> = {}) {
  return {
    id: 'out-1',
    siteId: 'site-1',
    technology: '4G',
    region: 'Algiers',
    outageType: 'planned',
    severity: 'major',
    status: 'active',
    startedAt: now,
    detectedAt: new Date(now.getTime() - 600000),
    estimatedDuration: 120,
    actualDuration: 90,
    affectedUsers: 500,
    rootCause: 'Power maintenance',
    compensationApplied: true,
    compensationSites: '[]',
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
    site: { name: 'Site A', code: 'SITE-A' },
    ...overrides,
  };
}

describe('GET /api/outages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns outages with summary', async () => {
    mockDb.outageEvent.findMany.mockResolvedValue([makeOutage()]);

    const req = new Request('http://localhost/api/outages');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.outages).toHaveLength(1);
    expect(data.summary).toBeDefined();
    expect(data.summary.total).toBe(1);
    expect(data.summary.activeOutages).toBe(1);
    expect(data.summary.totalAffectedUsers).toBe(500);
    expect(data.summary.bySeverity).toBeDefined();
    expect(data.summary.byStatus).toBeDefined();
    expect(data.summary.byOutageType).toBeDefined();
  });

  it('filters by technology', async () => {
    mockDb.outageEvent.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/outages?technology=5G');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockDb.outageEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ technology: '5G' }) }),
    );
  });

  it('filters by severity', async () => {
    mockDb.outageEvent.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/outages?severity=critical');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const call = mockDb.outageEvent.findMany.mock.calls[0][0];
    expect(call.where.severity).toBe('critical');
  });

  it('filters by status', async () => {
    mockDb.outageEvent.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/outages?status=resolved');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const call = mockDb.outageEvent.findMany.mock.calls[0][0];
    expect(call.where.status).toBe('resolved');
  });

  it('computes avg duration from resolved outages', async () => {
    mockDb.outageEvent.findMany.mockResolvedValue([
      makeOutage({ status: 'resolved', actualDuration: 60 }),
      makeOutage({ id: 'out-2', status: 'resolved', actualDuration: 120 }),
    ]);

    const req = new Request('http://localhost/api/outages');
    const res = await GET(req);
    const data = await res.json();

    expect(data.summary.avgDuration).toBe(90);
  });

  it('handles malformed compensationSites JSON', async () => {
    mockDb.outageEvent.findMany.mockResolvedValue([
      makeOutage({ compensationSites: 'not-json' }),
    ]);

    const req = new Request('http://localhost/api/outages');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.outages[0].compensationSites).toEqual([]);
  });

  it('maps outage fields correctly', async () => {
    const resolved = makeOutage({
      resolvedAt: new Date(now.getTime() + 120 * 60000),
      compensationSites: '["site-2"]',
    });
    mockDb.outageEvent.findMany.mockResolvedValue([resolved]);

    const req = new Request('http://localhost/api/outages');
    const res = await GET(req);
    const data = await res.json();

    const o = data.outages[0];
    expect(o.siteName).toBe('Site A');
    expect(o.startedAt).toBeDefined();
    expect(o.resolvedAt).toBeDefined();
    expect(o.compensationSites).toEqual(['site-2']);
  });

  it('returns 500 on error', async () => {
    mockDb.outageEvent.findMany.mockRejectedValue(new Error('DB error'));

    const req = new Request('http://localhost/api/outages');
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});
