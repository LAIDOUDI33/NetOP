import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/audit/route';
import { db } from '@/lib/db';

const mockDb = db as any;

describe('GET /api/audit', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns empty audit trail with default summary', async () => {
    const req = new Request('http://localhost/api/audit');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.items).toEqual([]);
    expect(data.summary.total).toBe(0);
    expect(data.summary.byEntityType).toEqual({});
    expect(data.summary.byAction).toEqual({});
  });

  it('returns mapped audit entries with summary', async () => {
    mockDb.auditTrail.findMany.mockResolvedValueOnce([
      {
        id: 'at-1', entityType: 'site', entityId: 'site-1', entityName: 'Site A',
        action: 'update', field: 'power', previousValue: '2500', newValue: '2000',
        technology: '4G', category: 'energy', requestedBy: 'admin', approvedBy: 'manager',
        impact: 'low', createdAt: new Date(),
      },
    ]);

    const req = new Request('http://localhost/api/audit');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.items).toHaveLength(1);
    expect(data.summary.total).toBe(1);
    expect(data.summary.byEntityType.site).toBe(1);
    expect(data.summary.byAction.update).toBe(1);
  });

  it('filters by entityType and action', async () => {
    mockDb.auditTrail.findMany.mockResolvedValueOnce([]);

    const req = new Request('http://localhost/api/audit?entityType=site&action=update');
    const res = await GET(req as any);

    expect(res.status).toBe(200);
    expect(mockDb.auditTrail.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { entityType: 'site', action: 'update' } }),
    );
  });

  it('returns 500 on error', async () => {
    mockDb.auditTrail.findMany.mockRejectedValueOnce(new Error('DB fail'));

    const req = new Request('http://localhost/api/audit');
    const res = await GET(req as any);

    expect(res.status).toBe(500);
  });
});
