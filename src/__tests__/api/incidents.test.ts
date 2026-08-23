import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeNextRequest, NOW } from './mock-db';

const { mockDb } = vi.hoisted(() => {
  const empty = [];
  const fm = vi.fn().mockResolvedValue(empty);
  const fu = vi.fn().mockResolvedValue(null);
  const cr = vi.fn().mockResolvedValue({ id: 'test-id', createdAt: NOW, updatedAt: NOW });
  const upd = vi.fn().mockResolvedValue({ id: 'test-id', createdAt: NOW, updatedAt: NOW });
  return {
    mockDb: {
      incident: { findMany: fm, findUnique: fu, create: cr, update: upd },
      networkSite: { findMany: fm, findUnique: fu },
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
      $executeRaw: vi.fn(), $on: vi.fn(), $connect: vi.fn(), $disconnect: vi.fn(),
    },
  };
});
vi.mock('@/lib/db', () => ({ db: mockDb }));

import { GET, POST, PATCH } from '@/app/api/incidents/route';

describe('GET /api/incidents', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 200 with incidents array and summary', async () => {
    const res = await GET(makeNextRequest('/api/incidents'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('incidents');
    expect(body).toHaveProperty('summary');
    expect(Array.isArray(body.incidents)).toBe(true);
    expect(body.summary).toHaveProperty('total');
    expect(body.summary).toHaveProperty('bySeverity');
    expect(body.summary).toHaveProperty('byStatus');
  });

  it('passes status filter when provided', async () => {
    await GET(makeNextRequest('/api/incidents?status=open'));
    expect(mockDb.incident.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'open' }) }),
    );
  });

  it('passes technology filter when provided', async () => {
    await GET(makeNextRequest('/api/incidents?technology=4G'));
    expect(mockDb.incident.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ technology: '4G' }) }),
    );
  });

  it('passes severity filter when provided', async () => {
    await GET(makeNextRequest('/api/incidents?severity=critical'));
    expect(mockDb.incident.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ severity: 'critical' }) }),
    );
  });

  it('returns zero counts in summary for empty results', async () => {
    const res = await GET(makeNextRequest('/api/incidents'));
    const body = await res.json();
    expect(body.summary.total).toBe(0);
    expect(body.summary.slaBreaches).toBe(0);
  });
});

describe('POST /api/incidents', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const validBody = {
    title: 'Site ALG-001 Down', technology: '4G', severity: 'critical',
    description: 'Full outage detected', siteId: 'site-1', category: 'network',
    priority: 8, tags: ['outage', 'critical'],
  };

  it('returns 201 with created incident', async () => {
    const res = await POST(makeNextRequest('/api/incidents', {
      method: 'POST', body: JSON.stringify(validBody), headers: { 'content-type': 'application/json' },
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('test-id');
    expect(body.title).toBe('Site ALG-001 Down');
    expect(body.status).toBe('open');
    expect(body.reportedBy).toBe('system');
  });

  it('calls db.incident.create with correct data', async () => {
    await POST(makeNextRequest('/api/incidents', {
      method: 'POST', body: JSON.stringify(validBody), headers: { 'content-type': 'application/json' },
    }));
    expect(mockDb.incident.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ title: validBody.title, technology: '4G', severity: 'critical', status: 'open' }) }),
    );
  });

  it('returns 400 when title is missing', async () => {
    const res = await POST(makeNextRequest('/api/incidents', {
      method: 'POST', body: JSON.stringify({ technology: '4G', severity: 'high' }), headers: { 'content-type': 'application/json' },
    }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when technology is missing', async () => {
    const res = await POST(makeNextRequest('/api/incidents', {
      method: 'POST', body: JSON.stringify({ title: 'Test', severity: 'high' }), headers: { 'content-type': 'application/json' },
    }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when severity is missing', async () => {
    const res = await POST(makeNextRequest('/api/incidents', {
      method: 'POST', body: JSON.stringify({ title: 'Test', technology: '4G' }), headers: { 'content-type': 'application/json' },
    }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for priority out of range', async () => {
    const res = await POST(makeNextRequest('/api/incidents', {
      method: 'POST', body: JSON.stringify({ ...validBody, priority: 15 }), headers: { 'content-type': 'application/json' },
    }));
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/incidents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.incident.findUnique.mockResolvedValue({
      id: 'test-id', title: 'Test Incident', status: 'open', createdAt: NOW, updatedAt: NOW,
      affectedSites: '[]', relatedAlerts: '[]', tags: '[]',
    });
  });

  it('investigates an incident', async () => {
    const res = await PATCH(makeNextRequest('/api/incidents', {
      method: 'PATCH', body: JSON.stringify({ id: 'test-id', action: 'investigate' }), headers: { 'content-type': 'application/json' },
    }));
    expect(res.status).toBe(200);
    expect(mockDb.incident.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'test-id' }, data: expect.objectContaining({ status: 'investigating' }) }),
    );
  });

  it('assigns an incident', async () => {
    const res = await PATCH(makeNextRequest('/api/incidents', {
      method: 'PATCH', body: JSON.stringify({ id: 'test-id', action: 'assign', assignedTo: 'user-1' }), headers: { 'content-type': 'application/json' },
    }));
    expect(res.status).toBe(200);
  });

  it('returns 400 when assign action lacks assignedTo', async () => {
    const res = await PATCH(makeNextRequest('/api/incidents', {
      method: 'PATCH', body: JSON.stringify({ id: 'test-id', action: 'assign' }), headers: { 'content-type': 'application/json' },
    }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when resolve action lacks rootCause', async () => {
    const res = await PATCH(makeNextRequest('/api/incidents', {
      method: 'PATCH', body: JSON.stringify({ id: 'test-id', action: 'resolve', resolution: 'Fixed' }), headers: { 'content-type': 'application/json' },
    }));
    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent incident', async () => {
    mockDb.incident.findUnique.mockResolvedValue(null);
    const res = await PATCH(makeNextRequest('/api/incidents', {
      method: 'PATCH', body: JSON.stringify({ id: 'nonexistent', action: 'investigate' }), headers: { 'content-type': 'application/json' },
    }));
    expect(res.status).toBe(404);
  });
});
