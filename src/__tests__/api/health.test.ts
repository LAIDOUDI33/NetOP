import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeNextRequest } from './mock-db';

const { mockDb } = vi.hoisted(() => {
  const NOW = new Date('2025-01-15T12:00:00.000Z');
  const fm = vi.fn().mockResolvedValue([]);
  return {
    mockDb: {
      healthScore: { findMany: fm },
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
      $executeRaw: vi.fn(), $on: vi.fn(), $connect: vi.fn(), $disconnect: vi.fn(),
    },
  };
});
vi.mock('@/lib/db', () => ({ db: mockDb }));

import { GET } from '@/app/api/health/route';
import { GET as HealthCheckGET } from '@/app/api/health-check/route';

describe('GET /api/health', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 200 with healthScores and summary', async () => {
    const res = await GET(makeNextRequest('/api/health'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('healthScores');
    expect(body).toHaveProperty('summary');
    expect(Array.isArray(body.healthScores)).toBe(true);
    expect(body.summary).toHaveProperty('total');
    expect(body.summary).toHaveProperty('avgOverall');
    expect(body.summary).toHaveProperty('byGrade');
    expect(body.summary).toHaveProperty('byRegion');
    expect(body.summary).toHaveProperty('byTrend');
  });

  it('passes technology filter to query', async () => {
    await GET(makeNextRequest('/api/health?technology=4G'));
    expect(mockDb.healthScore.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ technology: '4G' }) }),
    );
  });

  it('passes region filter to query', async () => {
    await GET(makeNextRequest('/api/health?region=Alger'));
    expect(mockDb.healthScore.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ region: 'Alger' }) }),
    );
  });

  it('passes grade filter to query', async () => {
    await GET(makeNextRequest('/api/health?grade=A'));
    expect(mockDb.healthScore.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ grade: 'A' }) }),
    );
  });

  it('returns zero avgOverall for empty results', async () => {
    const res = await GET(makeNextRequest('/api/health'));
    const body = await res.json();
    expect(body.summary.total).toBe(0);
    expect(body.summary.avgOverall).toBe(0);
  });
});

describe('GET /api/health-check', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 200 with status healthy', async () => {
    const res = await HealthCheckGET(makeNextRequest('/api/health-check'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('healthy');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('version');
    expect(body).toHaveProperty('uptime_ms');
    expect(body).toHaveProperty('services');
    expect(body.services.api).toBe('ok');
    expect(body.services.database).toBe('ok');
  });

  it('returns 503 when database is down', async () => {
    mockDb.$queryRaw.mockRejectedValueOnce(new Error('Connection refused'));
    const res = await HealthCheckGET(makeNextRequest('/api/health-check'));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe('unhealthy');
    expect(body.services.database).toBe('down');
  });

  it('includes db_latency_ms in response', async () => {
    const res = await HealthCheckGET(makeNextRequest('/api/health-check'));
    const body = await res.json();
    expect(typeof body.services.db_latency_ms).toBe('number');
  });
});
