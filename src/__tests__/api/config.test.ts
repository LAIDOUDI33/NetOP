import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/config/route';
import { db } from '@/lib/db';

const mockDb = db as any;

// configTemplate not in global mock
beforeEach(() => {
  mockDb.configTemplate = { findMany: vi.fn().mockResolvedValue([]) };
});

describe('GET /api/config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.configTemplate = { findMany: vi.fn().mockResolvedValue([]) };
  });

  it('returns empty templates with default summary', async () => {
    const req = new Request('http://localhost/api/config');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.templates).toEqual([]);
    expect(data.summary.total).toBe(0);
    expect(data.summary.totalApplications).toBe(0);
  });

  it('returns mapped templates with computed summary', async () => {
    mockDb.configTemplate.findMany.mockResolvedValueOnce([
      {
        id: 'ct-1', name: '4G Urban', technology: '4G', category: 'radio',
        description: 'Standard urban config', vendor: 'Ericsson',
        parameters: '{"pci":120}', isDefault: true, applyCount: 150,
        lastApplied: new Date(), createdAt: new Date(), updatedAt: new Date(),
      },
    ]);

    const req = new Request('http://localhost/api/config');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.templates).toHaveLength(1);
    expect(data.summary.total).toBe(1);
    expect(data.summary.totalApplications).toBe(150);
    expect(data.summary.byTech['4G']).toBe(1);
  });

  it('filters by technology and vendor', async () => {
    mockDb.configTemplate.findMany.mockResolvedValueOnce([]);

    const req = new Request('http://localhost/api/config?technology=5G&vendor=Huawei');
    const res = await GET(req as any);

    expect(res.status).toBe(200);
    expect(mockDb.configTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { technology: '5G', vendor: 'Huawei' } }),
    );
  });

  it('returns 500 on error', async () => {
    mockDb.configTemplate.findMany.mockRejectedValueOnce(new Error('DB fail'));

    const req = new Request('http://localhost/api/config');
    const res = await GET(req as any);

    expect(res.status).toBe(500);
  });
});
