import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db');
vi.mock('@/lib/rate-limit');
vi.mock('@/lib/api-auth');
vi.mock('@/lib/cache-helper');

import { GET } from '@/app/api/predictive/dashboard/route';
import { db } from '@/lib/db';

const mockDb = db as any;

function makeCapacityForecast(overrides: Record<string, any> = {}) {
  return {
    id: 'cf-1',
    riskLevel: 'high',
    confidence: 0.85,
    ...overrides,
  };
}

function makeChurnPrediction(overrides: Record<string, any> = {}) {
  return {
    id: 'cp-1',
    wilaya: 'Alger',
    atRiskCount: 500,
    revenueAtRisk: 25000,
    highRiskCount: 100,
    ...overrides,
  };
}

function makeFaultPrediction(overrides: Record<string, any> = {}) {
  return {
    id: 'fp-1',
    severity: 'critical',
    probability: 0.9,
    ...overrides,
  };
}

function makeTrafficForecast(overrides: Record<string, any> = {}) {
  return {
    id: 'tf-1',
    region: 'Algiers',
    trendDirection: 'growing',
    growthRate: 0.12,
    ...overrides,
  };
}

function makeRevenueProjection(overrides: Record<string, any> = {}) {
  return {
    id: 'rp-1',
    currentMonthly: 150000,
    growthRate: 0.05,
    trendDirection: 'growing',
    ...overrides,
  };
}

describe('GET /api/predictive/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all prediction summaries', async () => {
    mockDb.capacityForecast.findMany.mockResolvedValue([makeCapacityForecast()]);
    mockDb.churnPrediction.findMany.mockResolvedValue([makeChurnPrediction()]);
    mockDb.faultPrediction.findMany.mockResolvedValue([makeFaultPrediction()]);
    mockDb.trafficForecast.findMany.mockResolvedValue([makeTrafficForecast()]);
    mockDb.revenueProjection.findMany.mockResolvedValue([makeRevenueProjection()]);

    const req = new Request('http://localhost/api/predictive/dashboard');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.capacity).toBeDefined();
    expect(data.churn).toBeDefined();
    expect(data.fault).toBeDefined();
    expect(data.traffic).toBeDefined();
    expect(data.revenue).toBeDefined();
  });

  it('computes capacity summary', async () => {
    mockDb.capacityForecast.findMany.mockResolvedValue([
      makeCapacityForecast({ riskLevel: 'high', confidence: 0.85 }),
      makeCapacityForecast({ id: 'cf-2', riskLevel: 'critical', confidence: 0.95 }),
      makeCapacityForecast({ id: 'cf-3', riskLevel: 'low', confidence: 0.5 }),
    ]);
    mockDb.churnPrediction.findMany.mockResolvedValue([]);
    mockDb.faultPrediction.findMany.mockResolvedValue([]);
    mockDb.trafficForecast.findMany.mockResolvedValue([]);
    mockDb.revenueProjection.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/predictive/dashboard');
    const res = await GET(req);
    const data = await res.json();

    expect(data.capacity.total).toBe(3);
    expect(data.capacity.highRisk).toBe(2); // high + critical
    expect(data.capacity.criticalCount).toBe(1);
    expect(data.capacity.avgConfidence).toBeCloseTo(0.77, 1);
  });

  it('computes churn summary', async () => {
    mockDb.capacityForecast.findMany.mockResolvedValue([]);
    mockDb.churnPrediction.findMany.mockResolvedValue([
      makeChurnPrediction({ wilaya: 'Alger', atRiskCount: 500, revenueAtRisk: 25000, highRiskCount: 100 }),
      makeChurnPrediction({ id: 'cp-2', wilaya: 'Oran', atRiskCount: 300, revenueAtRisk: 15000, highRiskCount: 0 }),
    ]);
    mockDb.faultPrediction.findMany.mockResolvedValue([]);
    mockDb.trafficForecast.findMany.mockResolvedValue([]);
    mockDb.revenueProjection.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/predictive/dashboard');
    const res = await GET(req);
    const data = await res.json();

    expect(data.churn.totalAtRisk).toBe(800);
    expect(data.churn.totalRevenue).toBe(40000);
    expect(data.churn.highRiskWilayas).toContain('Alger');
  });

  it('computes fault summary', async () => {
    mockDb.capacityForecast.findMany.mockResolvedValue([]);
    mockDb.churnPrediction.findMany.mockResolvedValue([]);
    mockDb.faultPrediction.findMany.mockResolvedValue([
      makeFaultPrediction({ severity: 'critical', probability: 0.9 }),
      makeFaultPrediction({ id: 'fp-2', severity: 'medium', probability: 0.5 }),
    ]);
    mockDb.trafficForecast.findMany.mockResolvedValue([]);
    mockDb.revenueProjection.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/predictive/dashboard');
    const res = await GET(req);
    const data = await res.json();

    expect(data.fault.total).toBe(2);
    expect(data.fault.critical).toBe(1);
    expect(data.fault.avgProbability).toBeCloseTo(0.7, 1);
  });

  it('computes traffic summary with growing and declining regions', async () => {
    mockDb.capacityForecast.findMany.mockResolvedValue([]);
    mockDb.churnPrediction.findMany.mockResolvedValue([]);
    mockDb.faultPrediction.findMany.mockResolvedValue([]);
    mockDb.trafficForecast.findMany.mockResolvedValue([
      makeTrafficForecast({ region: 'Algiers', trendDirection: 'growing', growthRate: 0.12 }),
      makeTrafficForecast({ id: 'tf-2', region: 'Oran', trendDirection: 'declining', growthRate: -0.05 }),
      makeTrafficForecast({ id: 'tf-3', region: 'Algiers', trendDirection: 'growing', growthRate: 0.08 }),
    ]);
    mockDb.revenueProjection.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/predictive/dashboard');
    const res = await GET(req);
    const data = await res.json();

    expect(data.traffic.growingRegions).toContain('Algiers');
    expect(data.traffic.decliningRegions).toContain('Oran');
    // Deduplicated: Algiers only once
    expect(data.traffic.growingRegions.filter((r: string) => r === 'Algiers')).toHaveLength(1);
  });

  it('computes revenue summary', async () => {
    mockDb.capacityForecast.findMany.mockResolvedValue([]);
    mockDb.churnPrediction.findMany.mockResolvedValue([]);
    mockDb.faultPrediction.findMany.mockResolvedValue([]);
    mockDb.trafficForecast.findMany.mockResolvedValue([]);
    mockDb.revenueProjection.findMany.mockResolvedValue([
      makeRevenueProjection({ currentMonthly: 150000, growthRate: 0.05 }),
      makeRevenueProjection({ id: 'rp-2', currentMonthly: 100000, growthRate: -0.02, trendDirection: 'declining' }),
    ]);

    const req = new Request('http://localhost/api/predictive/dashboard');
    const res = await GET(req);
    const data = await res.json();

    expect(data.revenue.totalMonthly).toBe(250000);
    expect(data.revenue.avgGrowth).toBeCloseTo(0.015, 2);
    expect(data.revenue.riskCount).toBe(1);
  });

  it('handles all empty data', async () => {
    mockDb.capacityForecast.findMany.mockResolvedValue([]);
    mockDb.churnPrediction.findMany.mockResolvedValue([]);
    mockDb.faultPrediction.findMany.mockResolvedValue([]);
    mockDb.trafficForecast.findMany.mockResolvedValue([]);
    mockDb.revenueProjection.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/predictive/dashboard');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.capacity.total).toBe(0);
    expect(data.capacity.avgConfidence).toBe(0);
    expect(data.churn.totalAtRisk).toBe(0);
    expect(data.fault.total).toBe(0);
    expect(data.traffic.avgGrowth).toBe(0);
    expect(data.revenue.totalMonthly).toBe(0);
  });

  it('returns 500 on error', async () => {
    const { cachedQuery } = await import('@/lib/cache-helper');
    vi.mocked(cachedQuery).mockRejectedValueOnce(new Error('DB error'));

    const req = new Request('http://localhost/api/predictive/dashboard');
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});
