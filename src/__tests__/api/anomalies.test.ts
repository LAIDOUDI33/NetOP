import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db');
vi.mock('@/lib/rate-limit');
vi.mock('@/lib/api-auth');

import { GET, PATCH } from '@/app/api/anomalies/route';
import { db } from '@/lib/db';

const mockDb = db as any;

const now = new Date('2025-01-15T12:00:00.000Z');

function makeAnomaly(overrides: Record<string, any> = {}) {
  return {
    id: 'anomaly-1',
    siteId: 'site-1',
    technology: '4G',
    metric: 'rsrp',
    actualValue: -120,
    expectedValue: -85,
    zScore: -3.5,
    severity: 'critical',
    status: 'detected',
    description: 'RSRP anomaly detected',
    resolvedAt: null,
    createdAt: now,
    site: { name: 'Site A', code: 'SITE-A' },
    ...overrides,
  };
}

describe('GET /api/anomalies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns anomalies and stats', async () => {
    mockDb.anomalyEvent.findMany
      .mockResolvedValueOnce([makeAnomaly()]) // main query
      .mockResolvedValueOnce([makeAnomaly()]); // stats query

    const req = new Request('http://localhost/api/anomalies');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.anomalies).toHaveLength(1);
    expect(data.stats).toBeDefined();
    expect(data.stats.total).toBe(1);
    expect(data.stats.bySeverity.critical).toBe(1);
    expect(data.stats.byStatus.detected).toBe(1);
    expect(data.stats.byTech['4G']).toBe(1);
  });

  it('filters by technology', async () => {
    mockDb.anomalyEvent.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const req = new Request('http://localhost/api/anomalies?technology=3G');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const call = mockDb.anomalyEvent.findMany.mock.calls[0][0];
    expect(call.where.technology).toBe('3G');
  });

  it('filters by severity', async () => {
    mockDb.anomalyEvent.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const req = new Request('http://localhost/api/anomalies?severity=major');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const call = mockDb.anomalyEvent.findMany.mock.calls[0][0];
    expect(call.where.severity).toBe('major');
  });

  it('filters by status', async () => {
    mockDb.anomalyEvent.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const req = new Request('http://localhost/api/anomalies?status=resolved');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const call = mockDb.anomalyEvent.findMany.mock.calls[0][0];
    expect(call.where.status).toBe('resolved');
  });

  it('does not filter when value is "all"', async () => {
    mockDb.anomalyEvent.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const req = new Request('http://localhost/api/anomalies?technology=all&severity=all');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const call = mockDb.anomalyEvent.findMany.mock.calls[0][0];
    expect(call.where.technology).toBeUndefined();
    expect(call.where.severity).toBeUndefined();
  });

  it('maps anomaly fields correctly', async () => {
    mockDb.anomalyEvent.findMany
      .mockResolvedValueOnce([makeAnomaly({ resolvedAt: now })])
      .mockResolvedValueOnce([makeAnomaly({ resolvedAt: now })]);

    const req = new Request('http://localhost/api/anomalies');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    const a = data.anomalies[0];
    expect(a.id).toBe('anomaly-1');
    expect(a.siteName).toBe('Site A');
    expect(a.siteCode).toBe('SITE-A');
    expect(a.zScore).toBe(-3.5);
    expect(a.resolvedAt).toBeDefined();
    expect(a.createdAt).toBeDefined();
  });

  it('returns 500 on error', async () => {
    mockDb.anomalyEvent.findMany.mockRejectedValue(new Error('DB error'));

    const req = new Request('http://localhost/api/anomalies');
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});

describe('PATCH /api/anomalies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates anomaly status', async () => {
    mockDb.anomalyEvent.findUnique.mockResolvedValue(makeAnomaly());
    mockDb.anomalyEvent.update.mockResolvedValue(
      makeAnomaly({ status: 'investigating' }),
    );
    mockDb.auditLog.create.mockResolvedValue({});

    const req = new Request('http://localhost/api/anomalies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anomalyId: 'anomaly-1', status: 'investigating' }),
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDb.anomalyEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'anomaly-1' },
        data: { status: 'investigating' },
      }),
    );
    expect(mockDb.auditLog.create).toHaveBeenCalled();
  });

  it('sets resolvedAt when status is resolved', async () => {
    mockDb.anomalyEvent.findUnique.mockResolvedValue(makeAnomaly());
    mockDb.anomalyEvent.update.mockResolvedValue(
      makeAnomaly({ status: 'resolved' }),
    );
    mockDb.auditLog.create.mockResolvedValue({});

    const req = new Request('http://localhost/api/anomalies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anomalyId: 'anomaly-1', status: 'resolved' }),
    });
    const res = await PATCH(req);

    expect(res.status).toBe(200);
    expect(mockDb.anomalyEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'resolved', resolvedAt: expect.any(Date) },
      }),
    );
  });

  it('returns 404 when anomaly not found', async () => {
    mockDb.anomalyEvent.findUnique.mockResolvedValue(null);

    const req = new Request('http://localhost/api/anomalies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anomalyId: 'nonexistent', status: 'resolved' }),
    });
    const res = await PATCH(req);

    expect(res.status).toBe(404);
  });

  it('returns 400 for validation failure', async () => {
    const req = new Request('http://localhost/api/anomalies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'invalid_status' }),
    });
    const res = await PATCH(req);

    expect(res.status).toBe(400);
  });
});
