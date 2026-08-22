import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db');
vi.mock('@/lib/rate-limit');
vi.mock('@/lib/api-auth');
vi.mock('z-ai-web-dev-sdk');

import { GET, POST, PATCH } from '@/app/api/son/route';
import { db } from '@/lib/db';

const mockDb = db as any;

const now = new Date('2025-01-15T12:00:00.000Z');

function makeSonModule(overrides: Record<string, any> = {}) {
  return {
    id: 'mod-1',
    name: 'ANR',
    displayName: 'Automatic Neighbor Relation',
    technology: '4G',
    description: 'Auto neighbor discovery',
    enabled: true,
    mode: 'semi-automated',
    schedule: null,
    parameters: '{}',
    stats: '{"totalActions":5,"failCount":0}',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeSonAction(overrides: Record<string, any> = {}) {
  return {
    id: 'action-1',
    moduleId: 'mod-1',
    siteId: 'site-1',
    technology: '4G',
    actionType: 'add_neighbor',
    parameter: 'neighborRelation',
    previousValue: 'none',
    newValue: 'auto_discovered',
    reason: 'Handover success below 95%',
    status: 'applied',
    impactScore: 0.72,
    appliedAt: now,
    rolledBackAt: null,
    kpiBefore: '{}',
    kpiAfter: '{}',
    createdAt: now,
    updatedAt: now,
    site: { name: 'Site A', code: 'SITE-A' },
    ...overrides,
  };
}

describe('GET /api/son', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns modules with action counts and recent actions', async () => {
    mockDb.sonModule.findMany.mockResolvedValue([makeSonModule()]);
    mockDb.sonAction.count.mockResolvedValue(10);
    mockDb.sonAction.findMany.mockResolvedValue([makeSonAction()]);

    const req = new Request('http://localhost/api/son');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.modules).toHaveLength(1);
    const mod = data.modules[0];
    expect(mod.id).toBe('mod-1');
    expect(mod.name).toBe('ANR');
    expect(mod.displayName).toBe('Automatic Neighbor Relation');
    expect(mod.actionCount).toBe(10);
    expect(mod.recentActions).toHaveLength(1);
    expect(mod.parameters).toBeDefined();
    expect(mod.stats).toBeDefined();
  });

  it('filters by technology', async () => {
    mockDb.sonModule.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/son?technology=4G');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockDb.sonModule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { technology: '4G' } }),
    );
  });

  it('does not filter for ALL technology', async () => {
    mockDb.sonModule.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/son?technology=ALL');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const call = mockDb.sonModule.findMany.mock.calls[0][0];
    expect(call.where).toEqual({});
  });

  it('handles modules with string stats/parameters', async () => {
    mockDb.sonModule.findMany.mockResolvedValue([
      makeSonModule({ stats: '{"totalActions": 3}', parameters: '{"threshold": 95}' }),
    ]);
    mockDb.sonAction.count.mockResolvedValue(3);
    mockDb.sonAction.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/son');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(typeof data.modules[0].stats).toBe('object');
    expect(typeof data.modules[0].parameters).toBe('object');
  });

  it('returns 500 on error', async () => {
    mockDb.sonModule.findMany.mockRejectedValue(new Error('DB error'));

    const req = new Request('http://localhost/api/son');
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});

describe('POST /api/son', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new SON module', async () => {
    mockDb.sonModule.create.mockResolvedValue(
      makeSonModule({ id: 'new-mod' }),
    );
    mockDb.auditLog.create.mockResolvedValue({});

    const req = new Request('http://localhost/api/son', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'CCO',
        displayName: 'Coverage Optimization',
        technology: '4G',
        description: 'Optimize coverage',
      }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.module).toBeDefined();
    expect(data.module.name).toBe('CCO');
    expect(mockDb.auditLog.create).toHaveBeenCalled();
  });

  it('returns 400 for validation failure', async () => {
    const req = new Request('http://localhost/api/son', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }), // min 1
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Validation failed');
  });
});

describe('PATCH /api/son', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('toggles module enabled state', async () => {
    const existing = makeSonModule({ enabled: true });
    mockDb.sonModule.findUnique.mockResolvedValue(existing);
    mockDb.sonModule.update.mockResolvedValue(
      makeSonModule({ enabled: false }),
    );
    mockDb.auditLog.create.mockResolvedValue({});

    const req = new Request('http://localhost/api/son', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleId: 'mod-1', action: 'toggle' }),
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDb.sonModule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'mod-1' },
        data: { enabled: false },
      }),
    );
  });

  it('returns 404 when module not found for toggle', async () => {
    mockDb.sonModule.findUnique.mockResolvedValue(null);

    const req = new Request('http://localhost/api/son', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleId: 'nonexistent', action: 'toggle' }),
    });
    const res = await PATCH(req);

    expect(res.status).toBe(404);
  });

  it('executes module with fallback when no KPI data', async () => {
    const existing = makeSonModule({ name: 'ANR', enabled: true, technology: '4G' });
    mockDb.sonModule.findUnique.mockResolvedValue(existing);
    mockDb.kpiMetric.findMany.mockResolvedValue([]);
    mockDb.networkSite.findMany.mockResolvedValue([
      { id: 'site-1', name: 'Site A', technology: '4G' },
    ]);
    mockDb.kpiMetric.findFirst.mockResolvedValue(null);
    mockDb.sonAction.create.mockResolvedValue(
      makeSonAction({ id: 'new-action', kpiBefore: '{}', kpiAfter: '{}', status: 'applied' }),
    );
    mockDb.sonModule.update.mockResolvedValue(existing);
    mockDb.auditLog.create.mockResolvedValue({});

    const req = new Request('http://localhost/api/son', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleId: 'mod-1', action: 'execute' }),
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.action).toBeDefined();
    expect(data.action.actionType).toBe('add_neighbor');
  });

  it('refuses to execute a disabled module', async () => {
    const existing = makeSonModule({ enabled: false });
    mockDb.sonModule.findUnique.mockResolvedValue(existing);

    const req = new Request('http://localhost/api/son', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleId: 'mod-1', action: 'execute' }),
    });
    const res = await PATCH(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('disabled');
  });

  it('rollbacks all applied actions', async () => {
    const existing = makeSonModule();
    mockDb.sonModule.findUnique.mockResolvedValue(existing);
    mockDb.sonAction.updateMany.mockResolvedValue({ count: 3 });
    mockDb.auditLog.create.mockResolvedValue({});

    const req = new Request('http://localhost/api/son', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleId: 'mod-1', action: 'rollback' }),
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.rolledBackCount).toBe(3);
    expect(mockDb.sonAction.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { moduleId: 'mod-1', status: 'applied' },
      }),
    );
  });

  it('returns 400 for validation failure on PATCH', async () => {
    const req = new Request('http://localhost/api/son', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'invalid' }),
    });
    const res = await PATCH(req);

    expect(res.status).toBe(400);
  });
});
