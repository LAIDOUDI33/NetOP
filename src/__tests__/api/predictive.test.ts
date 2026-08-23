import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockDb, makeNextRequest } from './mock-db';

const { mockDb } = vi.hoisted(() => ({ mockDb: createMockDb() }));
vi.mock('@/lib/db', () => ({ db: mockDb }));

import { GET as DashboardGET } from '@/app/api/predictive/dashboard/route';
import { GET as CapacityGET } from '@/app/api/predictive/capacity/route';
import { GET as FaultsGET } from '@/app/api/predictive/faults/route';

// ─── Predictive Dashboard ────────────────────────────────
describe('GET /api/predictive/dashboard', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 200 with all prediction sections', async () => {
    const res = await DashboardGET(makeNextRequest('/api/predictive/dashboard'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('capacity');
    expect(body).toHaveProperty('churn');
    expect(body).toHaveProperty('fault');
    expect(body).toHaveProperty('traffic');
    expect(body).toHaveProperty('revenue');
  });

  it('capacity section has required keys', async () => {
    const res = await DashboardGET(makeNextRequest('/api/predictive/dashboard'));
    const body = await res.json();
    expect(body.capacity).toHaveProperty('total');
    expect(body.capacity).toHaveProperty('highRisk');
    expect(body.capacity).toHaveProperty('avgConfidence');
    expect(body.capacity).toHaveProperty('criticalCount');
  });

  it('churn section has required keys', async () => {
    const res = await DashboardGET(makeNextRequest('/api/predictive/dashboard'));
    const body = await res.json();
    expect(body.churn).toHaveProperty('totalAtRisk');
    expect(body.churn).toHaveProperty('totalRevenue');
    expect(body.churn).toHaveProperty('highRiskWilayas');
  });

  it('fault section has required keys', async () => {
    const res = await DashboardGET(makeNextRequest('/api/predictive/dashboard'));
    const body = await res.json();
    expect(body.fault).toHaveProperty('total');
    expect(body.fault).toHaveProperty('critical');
    expect(body.fault).toHaveProperty('avgProbability');
  });

  it('traffic section has required keys', async () => {
    const res = await DashboardGET(makeNextRequest('/api/predictive/dashboard'));
    const body = await res.json();
    expect(body.traffic).toHaveProperty('avgGrowth');
    expect(body.traffic).toHaveProperty('growingRegions');
    expect(body.traffic).toHaveProperty('decliningRegions');
  });

  it('revenue section has required keys', async () => {
    const res = await DashboardGET(makeNextRequest('/api/predictive/dashboard'));
    const body = await res.json();
    expect(body.revenue).toHaveProperty('totalMonthly');
    expect(body.revenue).toHaveProperty('avgGrowth');
    expect(body.revenue).toHaveProperty('riskCount');
  });

  it('returns zeros for empty predictions', async () => {
    const res = await DashboardGET(makeNextRequest('/api/predictive/dashboard'));
    const body = await res.json();
    expect(body.capacity.total).toBe(0);
    expect(body.capacity.highRisk).toBe(0);
    expect(body.churn.totalAtRisk).toBe(0);
    expect(body.fault.total).toBe(0);
    expect(body.revenue.totalMonthly).toBe(0);
  });
});

// ─── Predictive Capacity ─────────────────────────────────
describe('GET /api/predictive/capacity', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 200 with total and regions', async () => {
    const res = await CapacityGET(makeNextRequest('/api/predictive/capacity'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('regions');
    expect(Array.isArray(body.regions)).toBe(true);
  });

  it('passes technology filter', async () => {
    await CapacityGET(makeNextRequest('/api/predictive/capacity?technology=4G'));
    expect(mockDb.capacityForecast.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ technology: '4G' }),
      }),
    );
  });

  it('passes region filter', async () => {
    await CapacityGET(makeNextRequest('/api/predictive/capacity?region=Alger'));
    expect(mockDb.capacityForecast.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ region: 'Alger' }),
      }),
    );
  });

  it('passes riskLevel filter', async () => {
    await CapacityGET(makeNextRequest('/api/predictive/capacity?riskLevel=critical'));
    expect(mockDb.capacityForecast.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ riskLevel: 'critical' }),
      }),
    );
  });

  it('returns empty regions for empty results', async () => {
    const res = await CapacityGET(makeNextRequest('/api/predictive/capacity'));
    const body = await res.json();
    expect(body.total).toBe(0);
    expect(body.regions).toEqual([]);
  });
});

// ─── Predictive Faults ───────────────────────────────────
describe('GET /api/predictive/faults', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 200 with faults, severity and status distributions', async () => {
    const res = await FaultsGET(makeNextRequest('/api/predictive/faults'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('severityDistribution');
    expect(body).toHaveProperty('statusDistribution');
    expect(body).toHaveProperty('faults');
    expect(Array.isArray(body.faults)).toBe(true);
  });

  it('passes severity filter', async () => {
    await FaultsGET(makeNextRequest('/api/predictive/faults?severity=critical'));
    expect(mockDb.faultPrediction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ severity: 'critical' }),
      }),
    );
  });

  it('passes component filter', async () => {
    await FaultsGET(makeNextRequest('/api/predictive/faults?component=antenna'));
    expect(mockDb.faultPrediction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ component: 'antenna' }),
      }),
    );
  });

  it('passes status filter', async () => {
    await FaultsGET(makeNextRequest('/api/predictive/faults?status=active'));
    expect(mockDb.faultPrediction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'active' }),
      }),
    );
  });

  it('returns zero total for empty results', async () => {
    const res = await FaultsGET(makeNextRequest('/api/predictive/faults'));
    const body = await res.json();
    expect(body.total).toBe(0);
    expect(body.severityDistribution).toEqual({});
    expect(body.statusDistribution).toEqual({});
  });
});
