import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db');
vi.mock('@/lib/rate-limit');
vi.mock('@/lib/api-auth');

import { GET, POST, PATCH } from '@/app/api/incidents/route';
import { db } from '@/lib/db';

const mockDb = db as any;

const now = new Date('2025-01-15T12:00:00.000Z');

function makeIncident(overrides: Record<string, any> = {}) {
  return {
    id: 'inc-1',
    title: 'Site A Down',
    description: 'Site A is completely unreachable',
    technology: '4G',
    siteId: 'site-1',
    severity: 'critical',
    status: 'open',
    category: 'network',
    priority: 8,
    assignedTo: 'noc-team',
    reportedBy: 'system',
    mttrTarget: 60,
    mtbfValue: null,
    rootCause: null,
    resolution: null,
    affectedSites: '["site-1"]',
    relatedAlerts: '[]',
    tags: '["urgent"]',
    slaBreach: false,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
    site: { name: 'Site A', code: 'SITE-A', region: 'Algiers', technology: '4G' },
    ...overrides,
  };
}

describe('GET /api/incidents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns incidents with summary', async () => {
    mockDb.incident.findMany.mockResolvedValue([makeIncident()]);

    const req = new Request('http://localhost/api/incidents');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.incidents).toHaveLength(1);
    expect(data.summary).toBeDefined();
    expect(data.summary.total).toBe(1);
    expect(data.summary.bySeverity).toBeDefined();
    expect(data.summary.byStatus).toBeDefined();
    expect(data.summary.byCategory).toBeDefined();
  });

  it('filters by technology', async () => {
    mockDb.incident.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/incidents?technology=3G');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockDb.incident.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ technology: '3G' }) }),
    );
  });

  it('filters by severity', async () => {
    mockDb.incident.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/incidents?severity=critical');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const call = mockDb.incident.findMany.mock.calls[0][0];
    expect(call.where.severity).toBe('critical');
  });

  it('computes avgMTTR for resolved incidents', async () => {
    const resolved = makeIncident({
      status: 'closed',
      resolvedAt: new Date(now.getTime() + 30 * 60000), // 30 min later
    });
    mockDb.incident.findMany.mockResolvedValue([resolved]);

    const req = new Request('http://localhost/api/incidents');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.summary.avgMTTR).toBe(30);
  });

  it('counts SLA breaches', async () => {
    mockDb.incident.findMany.mockResolvedValue([
      makeIncident({ slaBreach: true }),
      makeIncident({ slaBreach: false }),
    ]);

    const req = new Request('http://localhost/api/incidents');
    const res = await GET(req);
    const data = await res.json();

    expect(data.summary.slaBreaches).toBe(1);
  });

  it('parses JSON fields', async () => {
    mockDb.incident.findMany.mockResolvedValue([makeIncident()]);

    const req = new Request('http://localhost/api/incidents');
    const res = await GET(req);
    const data = await res.json();

    const inc = data.incidents[0];
    expect(Array.isArray(inc.affectedSites)).toBe(true);
    expect(Array.isArray(inc.relatedAlerts)).toBe(true);
    expect(Array.isArray(inc.tags)).toBe(true);
  });

  it('returns 500 on error', async () => {
    mockDb.incident.findMany.mockRejectedValue(new Error('DB error'));

    const req = new Request('http://localhost/api/incidents');
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});

describe('POST /api/incidents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new incident', async () => {
    mockDb.incident.create.mockResolvedValue(makeIncident({ id: 'new-inc' }));

    const req = new Request('http://localhost/api/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Incident', technology: '4G', severity: 'major' }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBe('new-inc');
    expect(data.status).toBe('open');
    expect(data.reportedBy).toBe('system');
    expect(data.category).toBe('network');
    expect(data.priority).toBe(5);
  });

  it('creates incident with siteId and tags', async () => {
    mockDb.incident.create.mockResolvedValue(
      makeIncident({ siteId: 'site-1', tags: '["urgent","rf"]' }),
    );

    const req = new Request('http://localhost/api/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Tagged Incident', technology: '4G', severity: 'minor',
        siteId: 'site-1', tags: ['urgent', 'rf'],
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(mockDb.incident.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          siteId: 'site-1',
          tags: '["urgent","rf"]',
          affectedSites: '["site-1"]',
        }),
      }),
    );
  });

  it('returns 400 for validation failure', async () => {
    const req = new Request('http://localhost/api/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/incidents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves an incident', async () => {
    mockDb.incident.findUnique.mockResolvedValue(makeIncident());
    mockDb.incident.update.mockResolvedValue(
      makeIncident({ status: 'closed', resolvedAt: now, rootCause: 'Power failure', resolution: 'Replaced PSU' }),
    );

    const req = new Request('http://localhost/api/incidents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'inc-1', action: 'resolve',
        rootCause: 'Power failure', resolution: 'Replaced PSU',
      }),
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('closed');
    expect(mockDb.incident.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'closed',
          resolvedAt: expect.any(Date),
          rootCause: 'Power failure',
          resolution: 'Replaced PSU',
        }),
      }),
    );
  });

  it('returns 400 when resolve missing rootCause and resolution', async () => {
    mockDb.incident.findUnique.mockResolvedValue(makeIncident());

    const req = new Request('http://localhost/api/incidents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'inc-1', action: 'resolve' }),
    });
    const res = await PATCH(req);

    expect(res.status).toBe(400);
  });

  it('assigns an incident', async () => {
    mockDb.incident.findUnique.mockResolvedValue(makeIncident());
    mockDb.incident.update.mockResolvedValue(
      makeIncident({ assignedTo: 'rf-team-1' }),
    );

    const req = new Request('http://localhost/api/incidents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'inc-1', action: 'assign', assignedTo: 'rf-team-1' }),
    });
    const res = await PATCH(req);

    expect(res.status).toBe(200);
    expect(mockDb.incident.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { assignedTo: 'rf-team-1' } }),
    );
  });

  it('returns 400 when assign missing assignedTo', async () => {
    mockDb.incident.findUnique.mockResolvedValue(makeIncident());

    const req = new Request('http://localhost/api/incidents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'inc-1', action: 'assign' }),
    });
    const res = await PATCH(req);

    expect(res.status).toBe(400);
  });

  it('investigates an incident', async () => {
    mockDb.incident.findUnique.mockResolvedValue(makeIncident());
    mockDb.incident.update.mockResolvedValue(
      makeIncident({ status: 'investigating' }),
    );

    const req = new Request('http://localhost/api/incidents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'inc-1', action: 'investigate' }),
    });
    const res = await PATCH(req);

    expect(res.status).toBe(200);
    expect(mockDb.incident.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'investigating' } }),
    );
  });

  it('returns 404 for non-existent incident', async () => {
    mockDb.incident.findUnique.mockResolvedValue(null);

    const req = new Request('http://localhost/api/incidents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'nonexistent', action: 'investigate' }),
    });
    const res = await PATCH(req);

    expect(res.status).toBe(404);
  });

  it('returns 400 for validation failure', async () => {
    const req = new Request('http://localhost/api/incidents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete' }),
    });
    const res = await PATCH(req);

    expect(res.status).toBe(400);
  });
});
