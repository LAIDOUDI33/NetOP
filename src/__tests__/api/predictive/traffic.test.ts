import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/predictive/traffic/route';
import { db } from '@/lib/db';

const mockDb = db as any;

describe('GET /api/predictive/traffic', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns empty forecasts with default structure', async () => {
    const req = new Request('http://localhost/api/predictive/traffic');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.total).toBe(0);
    expect(data.avgGrowthRate).toBe(0);
    expect(data.trendDistribution).toEqual({});
    expect(data.forecasts).toEqual([]);
  });

  it('returns mapped forecasts with trend distribution', async () => {
    mockDb.trafficForecast.findMany.mockResolvedValueOnce([
      {
        id: 'tf-1', region: 'Algiers', technology: '4G', metric: 'data',
        currentDailyAvg: 120, forecastedDailyAvg: 140, growthRate: 16.7,
        peakHour: 20, peakDay: 'friday', seasonality: 'weekly',
        forecastPoints: '[{"day":1,"value":130}]', horizon: '30d',
        confidence: 0.85, trendDirection: 'increasing', createdAt: new Date(),
      },
    ]);

    const req = new Request('http://localhost/api/predictive/traffic');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.total).toBe(1);
    expect(data.avgGrowthRate).toBe(16.7);
    expect(data.trendDistribution.increasing).toBe(1);
    expect(data.forecasts[0].forecastPoints).toEqual([{ day: 1, value: 130 }]);
  });

  it('filters by region and technology', async () => {
    mockDb.trafficForecast.findMany.mockResolvedValueOnce([]);

    const req = new Request('http://localhost/api/predictive/traffic?region=Algiers&technology=5G');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockDb.trafficForecast.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { region: 'Algiers', technology: '5G' } }),
    );
  });

  it('returns 500 on error', async () => {
    mockDb.trafficForecast.findMany.mockRejectedValueOnce(new Error('DB fail'));

    const req = new Request('http://localhost/api/predictive/traffic');
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});
