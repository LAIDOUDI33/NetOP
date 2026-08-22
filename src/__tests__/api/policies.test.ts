import { describe, it, expect, vi, beforeEach } from 'vitest';


import { GET, POST, PATCH } from '@/app/api/policies/route';
import { db } from '@/lib/db';

const mockDb = db as any;

const now = new Date('2025-01-15T12:00:00.000Z');

function makePolicy(overrides: Record<string, any> = {}) {
  return {
    id: 'policy-1',
    name: 'Auto RSRP Fix',
    description: 'Fix low RSRP automatically',
    technology: '4G',
    triggerType: 'kpi_breach',
    triggerConfig: '{"metric":"rsrp","threshold":-100}',
    actionModules: '["ANR","MRO"]',
    scope: 'region',
    scopeValue: 'Algiers',
    priority: 8,
    enabled: true,
    cooldownMins: 30,
    stats: '{"totalRuns":10}',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeExecution(overrides: Record<string, any> = {}) {
  return {
    id: 'exec-1',
    policyId: 'policy-1',
    status: 'completed',
    triggerReason: 'RSRP breach',
    affectedSites: '["site-1"]',
    actionsTaken: '[{"action":"adjust_tilt"}]',
    kpiImpact: '{"rsrp":5}',
    rollbackReason: null,
    durationMs: 1200,
    createdAt: now,
    completedAt: now,
    ...overrides,
  };
}

describe('GET /api/policies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns policies with execution stats', async () => {
    mockDb.policy.findMany.mockResolvedValue([makePolicy()]);
    mockDb.policyExecution.findMany.mockResolvedValue([makeExecution()]);
    mockDb.policyExecution.count
      .mockResolvedValueOnce(10)  // totalCount
      .mockResolvedValueOnce(8); // successCount

    const req = new Request('http://localhost/api/policies');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.policies).toHaveLength(1);
    const p = data.policies[0];
    expect(p.id).toBe('policy-1');
    expect(p.name).toBe('Auto RSRP Fix');
    expect(p.technology).toBe('4G');
    expect(p.executionStats.totalRuns).toBe(10);
    expect(p.executionStats.successRate).toBe(80);
    expect(p.recentExecutions).toHaveLength(1);
  });

  it('handles policy with no executions', async () => {
    mockDb.policy.findMany.mockResolvedValue([makePolicy()]);
    mockDb.policyExecution.findMany.mockResolvedValue([]);
    mockDb.policyExecution.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const req = new Request('http://localhost/api/policies');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.policies[0].executionStats.totalRuns).toBe(0);
    expect(data.policies[0].executionStats.successRate).toBe(0);
    expect(data.policies[0].executionStats.lastRun).toBeNull();
  });

  it('parses JSON string fields', async () => {
    mockDb.policy.findMany.mockResolvedValue([makePolicy()]);
    mockDb.policyExecution.findMany.mockResolvedValue([makeExecution()]);
    mockDb.policyExecution.count.mockResolvedValue(0).mockResolvedValue(0);

    const req = new Request('http://localhost/api/policies');
    const res = await GET(req);
    const data = await res.json();

    const p = data.policies[0];
    expect(typeof p.triggerConfig).toBe('object');
    expect(typeof p.actionModules).toBe('object');
    expect(typeof p.stats).toBe('object');
  });

  it('returns 500 on error', async () => {
    mockDb.policy.findMany.mockRejectedValue(new Error('DB error'));

    const req = new Request('http://localhost/api/policies');
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});

describe('POST /api/policies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new policy', async () => {
    mockDb.policy.create.mockResolvedValue(makePolicy({ id: 'new-policy' }));
    mockDb.auditLog.create.mockResolvedValue({});

    const req = new Request('http://localhost/api/policies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'New Policy',
        technology: '5G',
        triggerType: 'anomaly_detected',
      }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.policy).toBeDefined();
    expect(mockDb.auditLog.create).toHaveBeenCalled();
  });

  it('returns 400 for validation failure', async () => {
    const req = new Request('http://localhost/api/policies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/policies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('toggles policy enabled state', async () => {
    const existing = makePolicy({ enabled: true });
    mockDb.policy.findUnique.mockResolvedValue(existing);
    mockDb.policy.update.mockResolvedValue(makePolicy({ enabled: false }));
    mockDb.auditLog.create.mockResolvedValue({});

    const req = new Request('http://localhost/api/policies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policyId: 'policy-1', action: 'toggle' }),
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDb.policy.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { enabled: false } }),
    );
  });

  it('returns 404 when policy not found', async () => {
    mockDb.policy.findUnique.mockResolvedValue(null);

    const req = new Request('http://localhost/api/policies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policyId: 'nonexistent', action: 'toggle' }),
    });
    const res = await PATCH(req);

    expect(res.status).toBe(404);
  });

  it('triggers a policy execution', async () => {
    const existing = makePolicy();
    mockDb.policy.findUnique.mockResolvedValue(existing);
    mockDb.policyExecution.create.mockResolvedValue(
      makeExecution({ id: 'new-exec', affectedSites: '[]', actionsTaken: '[]', kpiImpact: '{}' }),
    );
    mockDb.auditLog.create.mockResolvedValue({});

    const req = new Request('http://localhost/api/policies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policyId: 'policy-1', action: 'trigger' }),
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.execution).toBeDefined();
    expect(mockDb.policyExecution.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ policyId: 'policy-1', status: 'triggered' }) }),
    );
  });

  it('trigger with custom reason', async () => {
    const existing = makePolicy();
    mockDb.policy.findUnique.mockResolvedValue(existing);
    mockDb.policyExecution.create.mockResolvedValue(
      makeExecution({ affectedSites: '[]', actionsTaken: '[]', kpiImpact: '{}' }),
    );
    mockDb.auditLog.create.mockResolvedValue({});

    const req = new Request('http://localhost/api/policies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policyId: 'policy-1', action: 'trigger', triggerReason: 'Manual investigation' }),
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(mockDb.policyExecution.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ triggerReason: 'Manual investigation' }) }),
    );
  });

  it('returns 400 for validation failure', async () => {
    const req = new Request('http://localhost/api/policies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete' }),
    });
    const res = await PATCH(req);

    expect(res.status).toBe(400);
  });
});
