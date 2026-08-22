import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db');
vi.mock('@/lib/rate-limit');
vi.mock('@/lib/api-auth');
vi.mock('@/lib/demo-time');

import { GET } from '@/app/api/integration-hub/route';
import { db } from '@/lib/db';

const mockDb = db as any;

const now = new Date('2025-01-15T12:00:00.000Z');

function makeIntegration(overrides: Record<string, any> = {}) {
  return {
    id: 'int-1',
    name: 'OSS Integration',
    type: 'oss',
    vendor: 'Ericsson',
    protocol: 'REST',
    endpoint: 'https://oss.example.com/api',
    status: 'connected',
    lastSync: now,
    syncIntervalMin: 5,
    totalSyncs: 1000,
    failedSyncs: 10,
    dataPoints: 50000,
    latencyMs: 120,
    version: '3.2.1',
    ...overrides,
  };
}

describe('GET /api/integration-hub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns integrations, sync history, health timeline, and summary', async () => {
    mockDb.externalIntegration.findMany.mockResolvedValue([makeIntegration()]);

    const req = new Request('http://localhost/api/integration-hub');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.integrations).toHaveLength(1);
    expect(data.syncHistory).toHaveLength(20);
    expect(data.healthTimeline).toHaveLength(48);
    expect(data.summary).toBeDefined();
    expect(data.summary.totalIntegrations).toBe(1);
    expect(data.summary.connected).toBe(1);
  });

  it('computes summary counts correctly', async () => {
    mockDb.externalIntegration.findMany.mockResolvedValue([
      makeIntegration({ status: 'connected' }),
      makeIntegration({ id: 'int-2', status: 'degraded', name: 'CRM', dataPoints: 30000, latencyMs: 200, totalSyncs: 500 }),
      makeIntegration({ id: 'int-3', status: 'disconnected', name: 'Billing', dataPoints: 0, latencyMs: 0, totalSyncs: 0 }),
    ]);

    const req = new Request('http://localhost/api/integration-hub');
    const res = await GET(req);
    const data = await res.json();

    expect(data.summary.totalIntegrations).toBe(3);
    expect(data.summary.connected).toBe(1);
    expect(data.summary.degraded).toBe(1);
    expect(data.summary.disconnected).toBe(1);
    expect(data.summary.totalDataPoints).toBe(80000);
    expect(data.summary.avgLatency).toBe(Math.round((120 + 200 + 0) / 3));
  });

  it('generates health timeline with correct structure', async () => {
    mockDb.externalIntegration.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/integration-hub');
    const res = await GET(req);
    const data = await res.json();

    const timeline = data.healthTimeline;
    expect(timeline).toHaveLength(48);
    // Check that all entries have required fields
    for (const entry of timeline) {
      expect(entry).toHaveProperty('label');
      expect(entry).toHaveProperty('oss');
      expect(entry).toHaveProperty('crm');
      expect(entry).toHaveProperty('billing');
      expect(entry).toHaveProperty('son');
      expect(entry).toHaveProperty('nms');
    }
  });

  it('generates 20 sync history entries', async () => {
    mockDb.externalIntegration.findMany.mockResolvedValue([makeIntegration()]);

    const req = new Request('http://localhost/api/integration-hub');
    const res = await GET(req);
    const data = await res.json();

    expect(data.syncHistory).toHaveLength(20);
    const first = data.syncHistory[0];
    expect(first.id).toMatch(/^SYNC-\d{5}$/);
    expect(first).toHaveProperty('integrationName');
    expect(first).toHaveProperty('status');
    expect(first).toHaveProperty('recordsProcessed');
    expect(first).toHaveProperty('durationMs');
    expect(first).toHaveProperty('timestamp');
  });

  it('handles empty integrations', async () => {
    mockDb.externalIntegration.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/integration-hub');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.integrations).toHaveLength(0);
    expect(data.summary.totalIntegrations).toBe(0);
    expect(data.summary.avgLatency).toBe(0);
  });

  it('returns 500 on error', async () => {
    mockDb.externalIntegration.findMany.mockRejectedValue(new Error('DB error'));

    const req = new Request('http://localhost/api/integration-hub');
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});
