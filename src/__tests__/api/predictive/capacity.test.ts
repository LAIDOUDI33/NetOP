import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/predictive/capacity/route';
import { db } from '@/lib/db';

const mockDb = db as any;

describe('GET /api/predictive/capacity', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns empty forecasts with default structure', async () => {
    const req = new Request('http://localhost/api/predictive/capacity');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.total).toBe(0);
    expect(data.regions).toBeInstanceOf(Array);
  });

  it('groups forecasts by region', async () => {
    mockDb.capacityForecast.findMany.mockResolvedValueOnce([
      {
        id: 'cf-1', siteId: 's1', technology: '4G', region: 'Algiers', metric: 'PRB',
        currentValue: 75, forecastValue: 92, forecastHorizon: '30d', growthRate: 12,
        capacityLimit: 90, utilizationAtLimit: 100, confidence: 0.85,
        riskLevel: 'high', recommendation: 'Add carrier', timestamp: new Date(),
      },
      {
        id: 'cf-2', siteId: 's2', technology: '4G', region: 'Oran', metric: 'PRB',
        currentValue: 60, forecastValue: 70, forecastHorizon: '30d', growthRate: 8,
        capacityLimit: 90, utilizationAtLimit: 100, confidence: 0.9,
        riskLevel: 'low', recommendation: 'Monitor', timestamp: new Date(),
      },
    ]);

    const req = new Request('http://localhost/api/predictive/capacity');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.total).toBe(2);
    expect(data.regions.length).toBe(2);
  });

  it('filters by region and riskLevel', async () => {
    mockDb.capacityForecast.findMany.mockResolvedValueOnce([]);

    const req = new Request('http://localhost/api/predictive/capacity?region=Algiers&riskLevel=high');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockDb.capacityForecast.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { region: 'Algiers', riskLevel: 'high' } }),
    );
  });

  it('returns 500 on error', async () => {
    mockDb.capacityForecast.findMany.mockRejectedValueOnce(new Error('DB fail'));

    const req = new Request('http://localhost/api/predictive/capacity');
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});
