import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db');
vi.mock('@/lib/rate-limit');
vi.mock('@/lib/api-auth');

import { GET } from '@/app/api/etl/dashboard/route';
import { db } from '@/lib/db';

const mockDb = db as any;

const now = new Date('2025-01-15T12:00:00.000Z');

function makePipeline(overrides: Record<string, any> = {}) {
  return {
    id: 'pipe-1',
    name: 'KPI Import',
    status: 'active',
    enabled: true,
    ...overrides,
  };
}

function makeExecution(overrides: Record<string, any> = {}) {
  return {
    id: 'exec-1',
    pipelineId: 'pipe-1',
    status: 'succeeded',
    triggerType: 'schedule',
    recordsIn: 1000,
    recordsOut: 980,
    recordsError: 20,
    errorRate: 2,
    durationMs: 3000,
    errorMessage: null,
    retryCount: 0,
    stepResults: '[]',
    startedAt: now,
    completedAt: now,
    pipeline: { id: 'pipe-1', name: 'KPI Import', source: 'OSS', target: 'PostgreSQL' },
    ...overrides,
  };
}

function makeQualityRule(overrides: Record<string, any> = {}) {
  return {
    id: 'qr-1',
    severity: 'critical',
    isEnabled: true,
    lastPassRate: 95,
    ...overrides,
  };
}

function makeSource(overrides: Record<string, any> = {}) {
  return {
    id: 'src-1',
    status: 'active',
    ...overrides,
  };
}

describe('GET /api/etl/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns pipeline, execution, quality, and source stats', async () => {
    mockDb.dataPipeline.findMany.mockResolvedValue([
      makePipeline(),
      makePipeline({ id: 'pipe-2', status: 'failed', enabled: true }),
      makePipeline({ id: 'pipe-3', status: 'paused', enabled: true }),
      makePipeline({ id: 'pipe-4', status: 'disabled', enabled: false }),
    ]);

    // Two calls to pipelineExecution: exec24h + recentExecs
    mockDb.pipelineExecution.findMany
      .mockResolvedValueOnce([
        makeExecution({ status: 'succeeded' }),
        makeExecution({ id: 'exec-2', status: 'failed', durationMs: 5000 }),
      ])
      .mockResolvedValueOnce([
        makeExecution(),
      ])
      .mockResolvedValueOnce([  // third call: allExecs24h for throughput
        makeExecution(),
      ]);

    mockDb.dataQualityRule.findMany.mockResolvedValue([
      makeQualityRule(),
      makeQualityRule({ id: 'qr-2', severity: 'warning', lastPassRate: 100 }),
    ]);
    mockDb.dataSource.findMany.mockResolvedValue([
      makeSource(),
      makeSource({ id: 'src-2', status: 'error' }),
    ]);

    const req = new Request('http://localhost/api/etl/dashboard');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.pipelines).toBeDefined();
    expect(data.pipelines.total).toBe(4);
    expect(data.pipelines.active).toBe(1);
    expect(data.pipelines.failed).toBe(1);
    expect(data.pipelines.paused).toBe(1);
    expect(data.pipelines.disabled).toBe(1);
    expect(data.executions).toBeDefined();
    expect(data.quality).toBeDefined();
    expect(data.sources).toBeDefined();
    expect(data.recentExecutions).toBeDefined();
    expect(data.throughput).toBeDefined();
  });

  it('computes execution stats correctly', async () => {
    mockDb.dataPipeline.findMany.mockResolvedValue([]);
    mockDb.pipelineExecution.findMany
      .mockResolvedValueOnce([
        makeExecution({ status: 'succeeded', durationMs: 2000, recordsIn: 500 }),
        makeExecution({ id: 'exec-2', status: 'failed', durationMs: 0, recordsIn: 300 }),
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockDb.dataQualityRule.findMany.mockResolvedValue([]);
    mockDb.dataSource.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/etl/dashboard');
    const res = await GET(req);
    const data = await res.json();

    expect(data.executions.total24h).toBe(2);
    expect(data.executions.succeeded24h).toBe(1);
    expect(data.executions.failed24h).toBe(1);
    expect(data.executions.avgDurationMs).toBe(2000);
    expect(data.executions.totalRecords24h).toBe(800);
  });

  it('computes quality stats correctly', async () => {
    mockDb.dataPipeline.findMany.mockResolvedValue([]);
    mockDb.pipelineExecution.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockDb.dataQualityRule.findMany.mockResolvedValue([
      makeQualityRule({ lastPassRate: 90 }),
      makeQualityRule({ id: 'qr-2', lastPassRate: 80 }),
      makeQualityRule({ id: 'qr-3', isEnabled: false, lastPassRate: 50 }),
    ]);
    mockDb.dataSource.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/etl/dashboard');
    const res = await GET(req);
    const data = await res.json();

    // Only enabled rules count for overall pass rate
    expect(data.quality.overallPassRate).toBe(85); // avg of 90 and 80
    expect(data.quality.criticalPassRate).toBe(90);
    expect(data.quality.failingRules).toBe(2); // both enabled rules below 100
  });

  it('computes source stats', async () => {
    mockDb.dataPipeline.findMany.mockResolvedValue([]);
    mockDb.pipelineExecution.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockDb.dataQualityRule.findMany.mockResolvedValue([]);
    mockDb.dataSource.findMany.mockResolvedValue([
      makeSource({ status: 'active' }),
      makeSource({ id: 'src-2', status: 'active' }),
      makeSource({ id: 'src-3', status: 'error' }),
      makeSource({ id: 'src-4', status: 'maintenance' }),
    ]);

    const req = new Request('http://localhost/api/etl/dashboard');
    const res = await GET(req);
    const data = await res.json();

    expect(data.sources.total).toBe(4);
    expect(data.sources.active).toBe(2);
    expect(data.sources.error).toBe(1);
    expect(data.sources.maintenance).toBe(1);
  });

  it('generates 24-hour throughput data', async () => {
    mockDb.dataPipeline.findMany.mockResolvedValue([]);
    mockDb.pipelineExecution.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockDb.dataQualityRule.findMany.mockResolvedValue([]);
    mockDb.dataSource.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/etl/dashboard');
    const res = await GET(req);
    const data = await res.json();

    expect(data.throughput).toHaveLength(24);
    for (const point of data.throughput) {
      expect(point).toHaveProperty('hour');
      expect(point).toHaveProperty('ingested');
      expect(point).toHaveProperty('transformed');
      expect(point).toHaveProperty('errors');
    }
  });

  it('formats recent executions correctly', async () => {
    mockDb.dataPipeline.findMany.mockResolvedValue([]);
    mockDb.pipelineExecution.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        makeExecution({ stepResults: '[{"step":"extract","records":100}]' }),
      ])
      .mockResolvedValueOnce([]);
    mockDb.dataQualityRule.findMany.mockResolvedValue([]);
    mockDb.dataSource.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/etl/dashboard');
    const res = await GET(req);
    const data = await res.json();

    expect(data.recentExecutions).toHaveLength(1);
    const exec = data.recentExecutions[0];
    expect(exec.pipeline).toBeDefined();
    expect(exec.pipeline.name).toBe('KPI Import');
    expect(Array.isArray(exec.stepResults)).toBe(true);
  });

  it('returns 500 on error', async () => {
    mockDb.dataPipeline.findMany.mockRejectedValue(new Error('DB error'));

    const req = new Request('http://localhost/api/etl/dashboard');
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});
