import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockDb, makeNextRequest } from './mock-db';

const { mockDb } = vi.hoisted(() => ({ mockDb: createMockDb() }));
vi.mock('@/lib/db', () => ({ db: mockDb }));

import { GET } from '@/app/api/spectrum/route';

describe('GET /api/spectrum', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with items array and summary', async () => {
    const res = await GET(makeNextRequest('/api/spectrum'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('items');
    expect(body).toHaveProperty('summary');
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.summary).toHaveProperty('total');
    expect(body.summary).toHaveProperty('byBand');
    expect(body.summary).toHaveProperty('byTech');
    expect(body.summary).toHaveProperty('byStatus');
    expect(body.summary).toHaveProperty('refarmCandidates');
    expect(body.summary).toHaveProperty('totalBandwidthMhz');
    expect(body.summary).toHaveProperty('avgUtilizationPct');
  });

  it('passes technology filter', async () => {
    await GET(makeNextRequest('/api/spectrum?technology=4G'));
    expect(mockDb.spectrumBlock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ technology: '4G' }),
      }),
    );
  });

  it('passes band filter', async () => {
    await GET(makeNextRequest('/api/spectrum?band=1800'));
    expect(mockDb.spectrumBlock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ band: '1800' }),
      }),
    );
  });

  it('passes region filter', async () => {
    await GET(makeNextRequest('/api/spectrum?region=Alger'));
    expect(mockDb.spectrumBlock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ region: 'Alger' }),
      }),
    );
  });

  it('passes status filter', async () => {
    await GET(makeNextRequest('/api/spectrum?status=active'));
    expect(mockDb.spectrumBlock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'active' }),
      }),
    );
  });

  it('returns zero summary for empty results', async () => {
    const res = await GET(makeNextRequest('/api/spectrum'));
    const body = await res.json();
    expect(body.summary.total).toBe(0);
    expect(body.summary.refarmCandidates).toBe(0);
    expect(body.summary.totalBandwidthMhz).toBe(0);
    expect(body.summary.avgUtilizationPct).toBe(0);
  });

  it('orders by band then technology', async () => {
    await GET(makeNextRequest('/api/spectrum'));
    expect(mockDb.spectrumBlock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ band: 'asc' }, { technology: 'asc' }],
      }),
    );
  });
});
