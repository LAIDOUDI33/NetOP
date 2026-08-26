import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/changes/route';
import { db } from '@/lib/db';

const mockDb = db as any;

// changeRequest not in global mock
beforeEach(() => {
  mockDb.changeRequest = { findMany: vi.fn().mockResolvedValue([]) };
});

describe('GET /api/changes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.changeRequest = { findMany: vi.fn().mockResolvedValue([]) };
  });

  it('returns empty changes with default summary', async () => {
    const req = Object.assign(new Request('http://localhost/api/changes'), { nextUrl: new URL('http://localhost/api/changes') }) as any;
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.changes).toEqual([]);
    expect(data.summary.total).toBe(0);
    expect(data.summary.avgRiskLevel).toBe(0);
  });

  it('returns mapped changes with computed summary', async () => {
    mockDb.changeRequest.findMany.mockResolvedValueOnce([
      {
        id: 'cr-1', title: 'PCI Change', technology: '4G', siteId: 'site-1',
        siteName: 'Site A', category: 'parameter', parameter: 'pci',
        previousValue: '120', proposedValue: '250', reason: 'Interference',
        impact: 'Medium', riskLevel: 'medium', status: 'implemented',
        requestedBy: 'admin', approvedBy: 'manager', implementedAt: new Date(),
        rollbackReason: null, kpiImpact: '{"rsrp":3}', createdAt: new Date(), updatedAt: new Date(),
      },
    ]);

    const req = Object.assign(new Request('http://localhost/api/changes'), { nextUrl: new URL('http://localhost/api/changes') }) as any;
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.changes).toHaveLength(1);
    expect(data.changes[0].kpiImpact).toEqual({ rsrp: 3 });
    expect(data.summary.total).toBe(1);
    expect(data.summary.byStatus.implemented).toBe(1);
    expect(data.summary.byCategory.parameter).toBe(1);
  });

  it('filters by status and category', async () => {
    mockDb.changeRequest.findMany.mockResolvedValueOnce([]);

    const req = Object.assign(new Request('http://localhost/api/changes?status=pending&category=parameter'), { nextUrl: new URL('http://localhost/api/changes?status=pending&category=parameter') }) as any;
    const res = await GET(req as any);

    expect(res.status).toBe(200);
    expect(mockDb.changeRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'pending', category: 'parameter' } }),
    );
  });

  it('returns 500 on error', async () => {
    mockDb.changeRequest.findMany.mockRejectedValueOnce(new Error('DB fail'));

    const req = Object.assign(new Request('http://localhost/api/changes'), { nextUrl: new URL('http://localhost/api/changes') }) as any;
    const res = await GET(req as any);

    expect(res.status).toBe(500);
  });
});
