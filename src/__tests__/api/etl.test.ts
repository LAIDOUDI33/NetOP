import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockDb, makeNextRequest } from './mock-db';

const { mockDb } = vi.hoisted(() => ({ mockDb: createMockDb() }));
vi.mock('@/lib/db', () => ({ db: mockDb }));

import { GET, POST, PATCH, DELETE } from '@/app/api/etl/pipelines/route';
import { GET as ExecutionsGET } from '@/app/api/etl/executions/route';
import { GET as DashboardGET } from '@/app/api/etl/dashboard/route';

// ─── Pipelines ──────────────────────────────────────────
describe('GET /api/etl/pipelines', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 200 with pipelines array and total', async () => {
    const res = await GET(makeNextRequest('/api/etl/pipelines'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('pipelines');
    expect(body).toHaveProperty('total');
    expect(Array.isArray(body.pipelines)).toBe(true);
  });

  it('passes search filter', async () => {
    await GET(makeNextRequest('/api/etl/pipelines?search=oss'));
    expect(mockDb.dataPipeline.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ name: { contains: 'oss' } }),
      }),
    );
  });

  it('passes status filter', async () => {
    await GET(makeNextRequest('/api/etl/pipelines?status=active'));
    expect(mockDb.dataPipeline.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'active' }),
      }),
    );
  });

  it('defaults limit to 50', async () => {
    await GET(makeNextRequest('/api/etl/pipelines'));
    expect(mockDb.dataPipeline.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 }),
    );
  });

  it('clamps limit to 200', async () => {
    await GET(makeNextRequest('/api/etl/pipelines?limit=999'));
    expect(mockDb.dataPipeline.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 200 }),
    );
  });
});

describe('POST /api/etl/pipelines', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 201 with created pipeline', async () => {
    const res = await POST(
      makeNextRequest('/api/etl/pipelines', {
        method: 'POST',
        body: JSON.stringify({ name: 'OSS Import' }),
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('test-id');
    expect(body.name).toBe('OSS Import');
  });

  it('returns 400 for missing name', async () => {
    const res = await POST(
      makeNextRequest('/api/etl/pipelines', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('calls db.dataPipeline.create with schedule default', async () => {
    await POST(
      makeNextRequest('/api/etl/pipelines', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Pipeline' }),
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(mockDb.dataPipeline.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ schedule: '*/15 * * * *' }),
      }),
    );
  });
});

describe('PATCH /api/etl/pipelines', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 400 for missing id', async () => {
    const res = await PATCH(
      makeNextRequest('/api/etl/pipelines', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated' }),
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent pipeline', async () => {
    mockDb.dataPipeline.findUnique.mockResolvedValue(null);
    const res = await PATCH(
      makeNextRequest('/api/etl/pipelines', {
        method: 'PATCH',
        body: JSON.stringify({ id: 'nonexistent', name: 'Updated' }),
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/etl/pipelines', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 400 for missing id query param', async () => {
    const res = await DELETE(makeNextRequest('/api/etl/pipelines'));
    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent pipeline', async () => {
    mockDb.dataPipeline.findUnique.mockResolvedValue(null);
    const res = await DELETE(makeNextRequest('/api/etl/pipelines?id=nonexistent'));
    expect(res.status).toBe(404);
  });

  it('returns 409 when pipeline has running execution', async () => {
    mockDb.dataPipeline.findUnique.mockResolvedValue({ id: 'p1', createdBy: 'default-admin' });
    mockDb.pipelineExecution.findFirst.mockResolvedValue({ id: 'e1', status: 'running' });
    const res = await DELETE(makeNextRequest('/api/etl/pipelines?id=p1'));
    expect(res.status).toBe(409);
  });

  it('deletes pipeline when no running execution', async () => {
    mockDb.dataPipeline.findUnique.mockResolvedValue({ id: 'p1', createdBy: 'default-admin' });
    mockDb.pipelineExecution.findFirst.mockResolvedValue(null);
    const res = await DELETE(makeNextRequest('/api/etl/pipelines?id=p1'));
    expect(res.status).toBe(200);
    expect(mockDb.dataPipeline.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
  });
});

// ─── Executions ──────────────────────────────────────────
describe('GET /api/etl/executions', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 200 with executions array and total', async () => {
    const res = await ExecutionsGET(makeNextRequest('/api/etl/executions'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('executions');
    expect(body).toHaveProperty('total');
    expect(Array.isArray(body.executions)).toBe(true);
  });

  it('passes pipelineId filter', async () => {
    await ExecutionsGET(makeNextRequest('/api/etl/executions?pipelineId=p1'));
    expect(mockDb.pipelineExecution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ pipelineId: 'p1' }),
      }),
    );
  });

  it('passes status filter', async () => {
    await ExecutionsGET(makeNextRequest('/api/etl/executions?status=failed'));
    expect(mockDb.pipelineExecution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'failed' }),
      }),
    );
  });

  it('includes pipeline relation in query', async () => {
    await ExecutionsGET(makeNextRequest('/api/etl/executions'));
    expect(mockDb.pipelineExecution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({ pipeline: expect.any(Object) }),
      }),
    );
  });
});

// ─── Dashboard ───────────────────────────────────────────
describe('GET /api/etl/dashboard', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 200 with full dashboard structure', async () => {
    const res = await DashboardGET(makeNextRequest('/api/etl/dashboard'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('pipelines');
    expect(body).toHaveProperty('executions');
    expect(body).toHaveProperty('quality');
    expect(body).toHaveProperty('sources');
    expect(body).toHaveProperty('recentExecutions');
    expect(body).toHaveProperty('throughput');
  });

  it('pipelines stats has required keys', async () => {
    const res = await DashboardGET(makeNextRequest('/api/etl/dashboard'));
    const body = await res.json();
    const ps = body.pipelines;
    expect(ps).toHaveProperty('total');
    expect(ps).toHaveProperty('active');
    expect(ps).toHaveProperty('failed');
    expect(ps).toHaveProperty('paused');
    expect(ps).toHaveProperty('disabled');
  });

  it('quality stats has required keys', async () => {
    const res = await DashboardGET(makeNextRequest('/api/etl/dashboard'));
    const body = await res.json();
    expect(body.quality).toHaveProperty('overallPassRate');
    expect(body.quality).toHaveProperty('criticalPassRate');
    expect(body.quality).toHaveProperty('failingRules');
  });

  it('throughput has 24 hourly data points', async () => {
    const res = await DashboardGET(makeNextRequest('/api/etl/dashboard'));
    const body = await res.json();
    expect(body.throughput).toHaveLength(24);
  });

  it('throughput points have required shape', async () => {
    const res = await DashboardGET(makeNextRequest('/api/etl/dashboard'));
    const body = await res.json();
    for (const point of body.throughput) {
      expect(point).toHaveProperty('hour');
      expect(point).toHaveProperty('ingested');
      expect(point).toHaveProperty('transformed');
      expect(point).toHaveProperty('errors');
    }
  });

  it('returns 100 for pass rates when no rules exist', async () => {
    const res = await DashboardGET(makeNextRequest('/api/etl/dashboard'));
    const body = await res.json();
    expect(body.quality.overallPassRate).toBe(100);
    expect(body.quality.criticalPassRate).toBe(100);
  });
});
