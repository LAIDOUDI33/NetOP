import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeNextRequest, NOW } from './mock-db';
import { NextRequest } from 'next/server';

const { mockDb } = vi.hoisted(() => {
  const NOW = new Date('2025-01-15T12:00:00.000Z');
  const empty = [];
  const findMany = vi.fn().mockResolvedValue(empty);
  const findUnique = vi.fn().mockResolvedValue(null);
  const update = vi.fn().mockResolvedValue({ id: 'test-id', createdAt: NOW, updatedAt: NOW });
  const create = vi.fn().mockResolvedValue({ id: 'test-id', createdAt: NOW, updatedAt: NOW });
  return {
    mockDb: {
      alert: { findMany, findUnique, update, create, count: vi.fn().mockResolvedValue(0) },
      alertRule: { findMany, update },
      healthScore: { findMany },
      kpiMetric: { findMany, groupBy: findMany, aggregate: vi.fn().mockResolvedValue({ _max: { timestamp: NOW } }) },
      networkSite: { findMany, findUnique },
      capacityForecast: { findMany, create },
      energyMetric: { findMany },
      subscriberSegment: { findMany },
      spectrumBlock: { findMany },
      optimizationLog: { findMany, create },
      playbook: { findMany },
      playbookStep: { findMany },
      dataPipeline: { findMany, findUnique, create, update, delete: vi.fn().mockResolvedValue({ id: 'test-id' }), count: vi.fn().mockResolvedValue(0) },
      pipelineExecution: { findMany, findFirst: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0) },
      dataQualityRule: { findMany },
      dataSource: { findMany },
      churnPrediction: { findMany },
      trafficForecast: { findMany },
      revenueProjection: { findMany },
      faultPrediction: { findMany },
      outageEvent: { findMany },
      incident: { findMany, findUnique, create, update },
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
      $executeRaw: vi.fn(),
      $on: vi.fn(),
      $connect: vi.fn(),
      $disconnect: vi.fn(),
    },
  };
});

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/demo-time', () => ({
  demoHoursAgo: vi.fn().mockResolvedValue(new Date('2025-01-15T06:00:00.000Z')),
  demoMinutesAgo: vi.fn().mockResolvedValue(Date.now() - 60000),
}));

import { GET, PATCH } from '@/app/api/alerts/route';

describe('GET /api/alerts', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 200 with alerts, rules, and stats', async () => {
    const res = await GET(makeNextRequest('/api/alerts'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('alerts');
    expect(body).toHaveProperty('rules');
    expect(body).toHaveProperty('stats');
    expect(Array.isArray(body.alerts)).toBe(true);
    expect(Array.isArray(body.rules)).toBe(true);
    expect(body.stats).toHaveProperty('total');
    expect(body.stats).toHaveProperty('critical');
    expect(body.stats).toHaveProperty('byTech');
  });

  it('calls db.alert.findMany with resolvedAt null by default', async () => {
    await GET(makeNextRequest('/api/alerts'));
    expect(mockDb.alert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ resolvedAt: null }),
      }),
    );
  });

  it('passes severity filter to query', async () => {
    await GET(makeNextRequest('/api/alerts?severity=critical'));
    expect(mockDb.alert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ severity: 'critical' }),
      }),
    );
  });

  it('passes technology filter to query', async () => {
    await GET(makeNextRequest('/api/alerts?technology=4G'));
    expect(mockDb.alert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ technology: '4G' }),
      }),
    );
  });

  it('includes resolved alerts when resolved=true', async () => {
    await GET(makeNextRequest('/api/alerts?resolved=true'));
    expect(mockDb.alert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ resolvedAt: null }),
      }),
    );
  });

  it('returns correct stats shape with zero alerts', async () => {
    const res = await GET(makeNextRequest('/api/alerts'));
    const body = await res.json();
    expect(body.stats.total).toBe(0);
    expect(body.stats.critical).toBe(0);
    expect(body.stats.byTech).toEqual({ '2G': 0, '3G': 0, '4G': 0, '5G': 0 });
  });
});

describe('PATCH /api/alerts', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('acknowledges an alert with valid action', async () => {
    const res = await PATCH(
      makeNextRequest('/api/alerts', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'acknowledge', alertId: 'a1' }),
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockDb.alert.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'a1' }, data: { acknowledged: true } }),
    );
  });

  it('resolves an alert with valid action', async () => {
    const res = await PATCH(
      makeNextRequest('/api/alerts', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'resolve', alertId: 'a2' }),
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(res.status).toBe(200);
    expect(mockDb.alert.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'a2' } }),
    );
  });

  it('toggles alert rule enabled state', async () => {
    const res = await PATCH(
      makeNextRequest('/api/alerts', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'toggleRule', ruleId: 'r1', enabled: false }),
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(res.status).toBe(200);
    expect(mockDb.alertRule.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'r1' }, data: { enabled: false } }),
    );
  });

  it('returns 400 for missing action', async () => {
    const res = await PATCH(
      makeNextRequest('/api/alerts', {
        method: 'PATCH',
        body: JSON.stringify({ alertId: 'a1' }),
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid action value', async () => {
    const res = await PATCH(
      new NextRequest('http://localhost/api/alerts', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'delete' }),
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(res.status).toBe(400);
  });
});
