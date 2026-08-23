import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockDb, makeNextRequest } from './mock-db';

const { mockDb } = vi.hoisted(() => ({ mockDb: createMockDb() }));
vi.mock('@/lib/db', () => ({ db: mockDb }));

import { GET } from '@/app/api/energy/route';

describe('GET /api/energy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with metrics array and summary', async () => {
    const res = await GET(makeNextRequest('/api/energy'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('metrics');
    expect(body).toHaveProperty('summary');
    expect(Array.isArray(body.metrics)).toBe(true);
    expect(body.summary).toHaveProperty('totalSites');
    expect(body.summary).toHaveProperty('totalPowerKw');
    expect(body.summary).toHaveProperty('totalCO2kg');
    expect(body.summary).toHaveProperty('avgTemp');
    expect(body.summary).toHaveProperty('sleepModeCount');
    expect(body.summary).toHaveProperty('energySavingPct');
    expect(body.summary).toHaveProperty('byTech');
    expect(body.summary).toHaveProperty('byMode');
  });

  it('passes technology filter', async () => {
    await GET(makeNextRequest('/api/energy?technology=4G'));
    expect(mockDb.energyMetric.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ technology: '4G' }),
      }),
    );
  });

  it('passes mode filter', async () => {
    await GET(makeNextRequest('/api/energy?mode=sleep'));
    expect(mockDb.energyMetric.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ mode: 'sleep' }),
      }),
    );
  });

  it('returns null summary when siteId is specified', async () => {
    const res = await GET(makeNextRequest('/api/energy?siteId=site-1'));
    const body = await res.json();
    expect(body.summary).toBeNull();
    expect(mockDb.energyMetric.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ siteId: 'site-1' }),
      }),
    );
  });

  it('returns zero totals for empty results', async () => {
    const res = await GET(makeNextRequest('/api/energy'));
    const body = await res.json();
    expect(body.summary.totalSites).toBe(0);
    expect(body.summary.totalPowerKw).toBe(0);
    expect(body.summary.totalCO2kg).toBe(0);
  });

  it('includes site relation in query', async () => {
    await GET(makeNextRequest('/api/energy'));
    expect(mockDb.energyMetric.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({ site: expect.any(Object) }),
      }),
    );
  });
});
