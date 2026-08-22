import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db');
vi.mock('@/lib/rate-limit');
vi.mock('@/lib/api-auth');

import { GET } from '@/app/api/faults/route';
import { db } from '@/lib/db';

const mockDb = db as any;

const now = new Date('2025-01-15T12:00:00.000Z');

function makeFaultPrediction(overrides: Record<string, any> = {}) {
  return {
    id: 'fp-1',
    siteId: 'site-1',
    technology: '4G',
    component: 'RRU',
    faultType: 'hardware_degradation',
    probability: 0.85,
    severity: 'high',
    status: 'predicted',
    confidence: 0.9,
    indicators: '[{"metric":"rsrp","trend":"declining"}]',
    recommendedAction: 'Schedule RRU replacement',
    estimatedTimeToFail: '72h',
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
    site: { name: 'Site A', code: 'SITE-A', region: 'Algiers', technology: '4G' },
    ...overrides,
  };
}

describe('GET /api/faults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns fault predictions with summary', async () => {
    mockDb.faultPrediction.findMany.mockResolvedValue([makeFaultPrediction()]);

    const req = new Request('http://localhost/api/faults');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.predictions).toHaveLength(1);
    expect(data.summary).toBeDefined();
    expect(data.summary.total).toBe(1);
    expect(data.summary.bySeverity).toBeDefined();
    expect(data.summary.byStatus).toBeDefined();
    expect(data.summary.byComponent).toBeDefined();
  });

  it('filters by technology', async () => {
    mockDb.faultPrediction.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/faults?technology=3G');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockDb.faultPrediction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ technology: '3G' }) }),
    );
  });

  it('filters by severity', async () => {
    mockDb.faultPrediction.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/faults?severity=critical');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const call = mockDb.faultPrediction.findMany.mock.calls[0][0];
    expect(call.where.severity).toBe('critical');
  });

  it('filters by status', async () => {
    mockDb.faultPrediction.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/faults?status=resolved');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const call = mockDb.faultPrediction.findMany.mock.calls[0][0];
    expect(call.where.status).toBe('resolved');
  });

  it('filters by component', async () => {
    mockDb.faultPrediction.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/faults?component=RRU');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const call = mockDb.faultPrediction.findMany.mock.calls[0][0];
    expect(call.where.component).toBe('RRU');
  });

  it('computes summary statistics correctly', async () => {
    mockDb.faultPrediction.findMany.mockResolvedValue([
      makeFaultPrediction({ probability: 0.8, severity: 'high' }),
      makeFaultPrediction({ id: 'fp-2', probability: 0.6, severity: 'medium', component: 'antenna' }),
      makeFaultPrediction({ id: 'fp-3', probability: 0.9, severity: 'critical' }),
    ]);

    const req = new Request('http://localhost/api/faults');
    const res = await GET(req);
    const data = await res.json();

    expect(data.summary.total).toBe(3);
    expect(data.summary.avgProbability).toBeCloseTo(0.77, 1);
    expect(data.summary.highRiskCount).toBe(2); // high + critical
    expect(data.summary.bySeverity.high).toBe(1);
    expect(data.summary.bySeverity.critical).toBe(1);
    expect(data.summary.byComponent.RRU).toBe(1);
    expect(data.summary.byComponent.antenna).toBe(1);
  });

  it('parses indicators JSON field', async () => {
    mockDb.faultPrediction.findMany.mockResolvedValue([makeFaultPrediction()]);

    const req = new Request('http://localhost/api/faults');
    const res = await GET(req);
    const data = await res.json();

    expect(Array.isArray(data.predictions[0].indicators)).toBe(true);
  });

  it('returns 500 on error', async () => {
    mockDb.faultPrediction.findMany.mockRejectedValue(new Error('DB error'));

    const req = new Request('http://localhost/api/faults');
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});
