import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeNextRequest } from './mock-db';

const { mockDb } = vi.hoisted(() => {
  const fm = vi.fn().mockResolvedValue([]);
  return {
    mockDb: {
      faultPrediction: { findMany: fm },
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
      $executeRaw: vi.fn(), $on: vi.fn(), $connect: vi.fn(), $disconnect: vi.fn(),
    },
  };
});
vi.mock('@/lib/db', () => ({ db: mockDb }));

import { GET } from '@/app/api/faults/route';

describe('GET /api/faults', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 200 with predictions array and summary', async () => {
    const res = await GET(makeNextRequest('/api/faults'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('predictions');
    expect(body).toHaveProperty('summary');
    expect(Array.isArray(body.predictions)).toBe(true);
    expect(body.summary).toHaveProperty('total');
    expect(body.summary).toHaveProperty('bySeverity');
    expect(body.summary).toHaveProperty('byStatus');
    expect(body.summary).toHaveProperty('byComponent');
    expect(body.summary).toHaveProperty('avgProbability');
    expect(body.summary).toHaveProperty('highRiskCount');
  });

  it('passes technology filter', async () => {
    await GET(makeNextRequest('/api/faults?technology=4G'));
    expect(mockDb.faultPrediction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ technology: '4G' }) }),
    );
  });

  it('passes severity filter', async () => {
    await GET(makeNextRequest('/api/faults?severity=critical'));
    expect(mockDb.faultPrediction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ severity: 'critical' }) }),
    );
  });

  it('passes status filter', async () => {
    await GET(makeNextRequest('/api/faults?status=active'));
    expect(mockDb.faultPrediction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'active' }) }),
    );
  });

  it('passes component filter', async () => {
    await GET(makeNextRequest('/api/faults?component=antenna'));
    expect(mockDb.faultPrediction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ component: 'antenna' }) }),
    );
  });

  it('returns zero summary values for empty results', async () => {
    const res = await GET(makeNextRequest('/api/faults'));
    const body = await res.json();
    expect(body.summary.total).toBe(0);
    expect(body.summary.avgProbability).toBe(0);
    expect(body.summary.highRiskCount).toBe(0);
  });

  it('includes site relation in query', async () => {
    await GET(makeNextRequest('/api/faults'));
    expect(mockDb.faultPrediction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: expect.objectContaining({ site: expect.any(Object) }) }),
    );
  });
});
