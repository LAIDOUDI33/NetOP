import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/interference/route';
import { db } from '@/lib/db';

const mockDb = db as any;

// interferenceEvent not in global mock
beforeEach(() => {
  mockDb.interferenceEvent = { findMany: vi.fn().mockResolvedValue([]) };
});

describe('GET /api/interference', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.interferenceEvent = { findMany: vi.fn().mockResolvedValue([]) };
  });

  it('returns empty events with default summary', async () => {
    const req = new Request('http://localhost/api/interference');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.events).toEqual([]);
    expect(data.summary.total).toBe(0);
    expect(data.summary.avgImpact).toBe(0);
  });

  it('returns mapped events with computed summary', async () => {
    mockDb.interferenceEvent.findMany.mockResolvedValueOnce([
      {
        id: 'ie-1', siteId: 'site-1', technology: '4G', interferenceType: 'co-channel',
        severity: 'high', status: 'active', sourceCell: 'cell-a', sourceCellName: 'Cell A',
        conflictingCell: 'cell-b', conflictingCellName: 'Cell B', frequency: 2100,
        pci: 120, affectedKpis: '{"rsrp":-5}', impactScore: 8.5, recommendation: 'Adjust PCI',
        resolvedAt: null, createdAt: new Date(), updatedAt: new Date(),
        site: { name: 'Site X', code: 'SITE-X' },
      },
    ]);

    const req = new Request('http://localhost/api/interference');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.events).toHaveLength(1);
    expect(data.summary.total).toBe(1);
    expect(data.summary.avgImpact).toBe(8.5);
    expect(data.summary.bySeverity.high).toBe(1);
    expect(data.summary.byType['co-channel']).toBe(1);
  });

  it('filters by multiple params', async () => {
    mockDb.interferenceEvent.findMany.mockResolvedValueOnce([]);

    const req = new Request('http://localhost/api/interference?technology=5G&severity=high&status=active');
    const res = await GET(req as any);

    expect(res.status).toBe(200);
    expect(mockDb.interferenceEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { technology: '5G', severity: 'high', status: 'active' } }),
    );
  });

  it('returns 500 on error', async () => {
    mockDb.interferenceEvent.findMany.mockRejectedValueOnce(new Error('DB fail'));

    const req = new Request('http://localhost/api/interference');
    const res = await GET(req as any);

    expect(res.status).toBe(500);
  });
});
