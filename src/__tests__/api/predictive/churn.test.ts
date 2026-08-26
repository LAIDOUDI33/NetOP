import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/predictive/churn/route';
import { db } from '@/lib/db';

const mockDb = db as any;

describe('GET /api/predictive/churn', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns empty predictions with default structure', async () => {
    const req = new Request('http://localhost/api/predictive/churn');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.total).toBe(0);
    expect(data.totalAtRisk).toBe(0);
    expect(data.totalHighRisk).toBe(0);
    expect(data.totalRevenueAtRisk).toBe(0);
    expect(data.totalSubscribers).toBe(0);
    expect(data.avgChurnRate).toBe(0);
    expect(data.predictions).toEqual([]);
  });

  it('returns mapped predictions with aggregations', async () => {
    mockDb.churnPrediction.findMany.mockResolvedValueOnce([
      {
        id: 'cp-1', wilaya: 'Algiers', segmentName: 'Premium', technology: '4G',
        totalSubscribers: 50000, atRiskCount: 2500, highRiskCount: 500,
        churnRate: 0.03, predictedChurnRate: 0.04, churnTrend: 'increasing',
        drivers: '[{"name":"coverage"}]', confidence: 0.82,
        revenueAtRisk: 1200000, predictionDate: new Date(), horizon: '30d',
      },
    ]);

    const req = new Request('http://localhost/api/predictive/churn');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.total).toBe(1);
    expect(data.totalAtRisk).toBe(2500);
    expect(data.totalHighRisk).toBe(500);
    expect(data.totalRevenueAtRisk).toBe(1200000);
    expect(data.predictions[0].drivers).toEqual([{ name: 'coverage' }]);
  });

  it('filters by wilaya and trend', async () => {
    mockDb.churnPrediction.findMany.mockResolvedValueOnce([]);

    const req = new Request('http://localhost/api/predictive/churn?wilaya=Algiers&trend=increasing');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockDb.churnPrediction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { wilaya: 'Algiers', churnTrend: 'increasing' } }),
    );
  });

  it('returns 500 on error', async () => {
    mockDb.churnPrediction.findMany.mockRejectedValueOnce(new Error('DB fail'));

    const req = new Request('http://localhost/api/predictive/churn');
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});
