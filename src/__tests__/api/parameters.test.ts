import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH } from '@/app/api/parameters/route';
import { db } from '@/lib/db';

const mockDb = db as any;

// networkParameter not in global mock
beforeEach(() => {
  mockDb.networkParameter = {
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue({}),
  };
});

describe('GET /api/parameters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.networkParameter = {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
    };
  });

  it('returns empty parameters', async () => {
    const req = new Request('http://localhost/api/parameters');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.parameters).toEqual([]);
  });

  it('returns mapped parameters', async () => {
    mockDb.networkParameter.findMany.mockResolvedValueOnce([
      {
        id: 'np-1', technology: '4G', parameter: 'pci', displayName: 'PCI',
        currentValue: '120', unit: '', minRange: '0', maxRange: '503',
        description: 'Physical Cell ID', category: 'radio',
      },
    ]);

    const req = new Request('http://localhost/api/parameters');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.parameters).toHaveLength(1);
    expect(data.parameters[0].parameter).toBe('pci');
  });

  it('filters by technology and category', async () => {
    mockDb.networkParameter.findMany.mockResolvedValueOnce([]);

    const req = new Request('http://localhost/api/parameters?technology=5G&category=radio');
    const res = await GET(req as any);

    expect(res.status).toBe(200);
    expect(mockDb.networkParameter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { technology: '5G', category: 'radio' } }),
    );
  });

  it('returns 500 on error', async () => {
    mockDb.networkParameter.findMany.mockRejectedValueOnce(new Error('DB fail'));

    const req = new Request('http://localhost/api/parameters');
    const res = await GET(req as any);

    expect(res.status).toBe(500);
  });
});

describe('PATCH /api/parameters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.networkParameter = {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
    };
  });

  it('updates a parameter and returns success', async () => {
    mockDb.networkParameter.findUnique.mockResolvedValueOnce({ id: 'np-1' });
    mockDb.networkParameter.update.mockResolvedValueOnce({ id: 'np-1', currentValue: '250' });

    const req = new Request('http://localhost/api/parameters', {
      method: 'PATCH',
      body: JSON.stringify({ paramId: 'np-1', currentValue: 250 }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PATCH(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('returns 404 when parameter not found', async () => {
    mockDb.networkParameter.findUnique.mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/parameters', {
      method: 'PATCH',
      body: JSON.stringify({ paramId: 'nonexistent', currentValue: 'x' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PATCH(req as any);
    expect(res.status).toBe(404);
  });

  it('returns 400 for validation error', async () => {
    const req = new Request('http://localhost/api/parameters', {
      method: 'PATCH',
      body: JSON.stringify({ paramId: '' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PATCH(req as any);
    expect(res.status).toBe(400);
  });
});
