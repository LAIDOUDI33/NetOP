import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeNextRequest } from './mock-db';

const { mockDb } = vi.hoisted(() => {
  const fm = vi.fn().mockResolvedValue([]);
  return {
    mockDb: {
      outageEvent: { findMany: fm },
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
      $executeRaw: vi.fn(), $on: vi.fn(), $connect: vi.fn(), $disconnect: vi.fn(),
    },
  };
});
vi.mock('@/lib/db', () => ({ db: mockDb }));

import { GET } from '@/app/api/outages/route';

describe('GET /api/outages', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 200 with outages array and summary', async () => {
    const res = await GET(makeNextRequest('/api/outages'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('outages');
    expect(body).toHaveProperty('summary');
    expect(Array.isArray(body.outages)).toBe(true);
    expect(body.summary).toHaveProperty('total');
    expect(body.summary).toHaveProperty('bySeverity');
    expect(body.summary).toHaveProperty('byStatus');
    expect(body.summary).toHaveProperty('byOutageType');
    expect(body.summary).toHaveProperty('activeOutages');
    expect(body.summary).toHaveProperty('totalAffectedUsers');
  });

  it('passes technology filter', async () => {
    await GET(makeNextRequest('/api/outages?technology=4G'));
    expect(mockDb.outageEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ technology: '4G' }) }),
    );
  });

  it('passes severity filter', async () => {
    await GET(makeNextRequest('/api/outages?severity=critical'));
    expect(mockDb.outageEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ severity: 'critical' }) }),
    );
  });

  it('passes status filter for active outages', async () => {
    await GET(makeNextRequest('/api/outages?status=active'));
    expect(mockDb.outageEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'active' }) }),
    );
  });

  it('returns zero summary for empty results', async () => {
    const res = await GET(makeNextRequest('/api/outages'));
    const body = await res.json();
    expect(body.summary.total).toBe(0);
    expect(body.summary.activeOutages).toBe(0);
    expect(body.summary.totalAffectedUsers).toBe(0);
  });

  it('includes site relation in query', async () => {
    await GET(makeNextRequest('/api/outages'));
    expect(mockDb.outageEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: expect.objectContaining({ site: expect.any(Object) }) }),
    );
  });

  it('orders by startedAt desc', async () => {
    await GET(makeNextRequest('/api/outages'));
    expect(mockDb.outageEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { startedAt: 'desc' } }),
    );
  });
});
