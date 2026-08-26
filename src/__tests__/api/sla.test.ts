import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/sla/route';
import { db } from '@/lib/db';

const mockDb = db as any;

// sLATarget not in global mock
beforeEach(() => {
  mockDb.sLATarget = { findMany: vi.fn().mockResolvedValue([]) };
});

describe('GET /api/sla', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.sLATarget = { findMany: vi.fn().mockResolvedValue([]) };
  });

  it('returns empty targets with default summary', async () => {
    const req = new Request('http://localhost/api/sla');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.targets).toEqual([]);
    expect(data.summary.total).toBe(0);
    expect(data.summary.complianceRate).toBe(0);
  });

  it('returns compliance results for enabled targets', async () => {
    mockDb.sLATarget.findMany.mockResolvedValueOnce([
      { id: 'sla-1', technology: '4G', metric: 'availability', targetValue: 99.5, condition: 'gte', severity: 'critical', enabled: true },
    ]);
    mockDb.kpiMetric.groupBy.mockResolvedValueOnce([
      { technology: '4G', _avg: { availability: 99.8 } },
    ]);

    const req = new Request('http://localhost/api/sla');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.targets).toHaveLength(1);
    expect(data.targets[0].compliant).toBe(true);
    expect(data.summary.compliant).toBe(1);
  });

  it('detects SLA breach correctly', async () => {
    mockDb.sLATarget.findMany.mockResolvedValueOnce([
      { id: 'sla-2', technology: '4G', metric: 'availability', targetValue: 99.5, condition: 'gte', severity: 'critical', enabled: true },
    ]);
    mockDb.kpiMetric.groupBy.mockResolvedValueOnce([
      { technology: '4G', _avg: { availability: 97.0 } },
    ]);

    const req = new Request('http://localhost/api/sla');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.targets[0].compliant).toBe(false);
    expect(data.targets[0].breachPercent).toBeGreaterThan(0);
    expect(data.summary.breached).toBe(1);
  });

  it('returns 500 on error', async () => {
    mockDb.sLATarget.findMany.mockRejectedValueOnce(new Error('DB fail'));

    const req = new Request('http://localhost/api/sla');
    const res = await GET(req as any);

    expect(res.status).toBe(500);
  });
});
