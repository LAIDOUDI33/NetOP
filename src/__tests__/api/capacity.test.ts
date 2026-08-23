import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockDb, makeNextRequest } from './mock-db';

const { mockDb } = vi.hoisted(() => ({ mockDb: createMockDb() }));
vi.mock('@/lib/db', () => ({ db: mockDb }));

import { GET, POST } from '@/app/api/capacity/route';

describe('GET /api/capacity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with forecasts array and summary', async () => {
    const res = await GET(makeNextRequest('/api/capacity'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('forecasts');
    expect(body).toHaveProperty('summary');
    expect(Array.isArray(body.forecasts)).toBe(true);
    expect(body.summary).toHaveProperty('total');
    expect(body.summary).toHaveProperty('byRisk');
    expect(body.summary).toHaveProperty('avgGrowthRate');
    expect(body.summary).toHaveProperty('sitesAtRisk');
  });

  it('passes technology filter', async () => {
    await GET(makeNextRequest('/api/capacity?technology=4G'));
    expect(mockDb.capacityForecast.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ technology: '4G' }),
      }),
    );
  });

  it('passes region filter', async () => {
    await GET(makeNextRequest('/api/capacity?region=Alger'));
    expect(mockDb.capacityForecast.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ region: 'Alger' }),
      }),
    );
  });

  it('passes riskLevel filter', async () => {
    await GET(makeNextRequest('/api/capacity?riskLevel=high'));
    expect(mockDb.capacityForecast.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ riskLevel: 'high' }),
      }),
    );
  });

  it('returns zero summary for empty results', async () => {
    const res = await GET(makeNextRequest('/api/capacity'));
    const body = await res.json();
    expect(body.summary.total).toBe(0);
    expect(body.summary.avgGrowthRate).toBe(0);
    expect(body.summary.sitesAtRisk).toBe(0);
  });

  it('includes site relation in query', async () => {
    await GET(makeNextRequest('/api/capacity'));
    expect(mockDb.capacityForecast.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({ site: expect.any(Object) }),
      }),
    );
  });
});

describe('POST /api/capacity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validBody = {
    siteId: 'site-1',
    technology: '4G',
    metric: 'prbUtilization',
    currentValue: 75.5,
    forecastValue: 92.0,
  };

  it('returns 201 with created forecast', async () => {
    mockDb.networkSite.findUnique.mockResolvedValue({
      id: 'site-1',
      region: 'Alger',
      technology: '4G',
    });
    const res = await POST(
      makeNextRequest('/api/capacity', {
        method: 'POST',
        body: JSON.stringify(validBody),
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('test-id');
    expect(body.technology).toBe('4G');
    expect(body.metric).toBe('prbUtilization');
  });

  it('returns 404 when site does not exist', async () => {
    mockDb.networkSite.findUnique.mockResolvedValue(null);
    const res = await POST(
      makeNextRequest('/api/capacity', {
        method: 'POST',
        body: JSON.stringify(validBody),
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Site not found');
  });

  it('returns 400 for missing siteId', async () => {
    const res = await POST(
      makeNextRequest('/api/capacity', {
        method: 'POST',
        body: JSON.stringify({ technology: '4G', metric: 'x', currentValue: 1, forecastValue: 2 }),
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing technology', async () => {
    const res = await POST(
      makeNextRequest('/api/capacity', {
        method: 'POST',
        body: JSON.stringify({ siteId: 's', metric: 'x', currentValue: 1, forecastValue: 2 }),
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing metric', async () => {
    const res = await POST(
      makeNextRequest('/api/capacity', {
        method: 'POST',
        body: JSON.stringify({ siteId: 's', technology: '4G', currentValue: 1, forecastValue: 2 }),
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(res.status).toBe(400);
  });
});
