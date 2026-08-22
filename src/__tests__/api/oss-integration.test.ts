import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db');
vi.mock('@/lib/rate-limit');
vi.mock('@/lib/api-auth');
vi.mock('@/lib/demo-time');

import { GET } from '@/app/api/integrations/oss/route';
import { db } from '@/lib/db';

const mockDb = db as any;

const now = new Date('2025-01-15T12:00:00.000Z');

function makeNetworkElement(overrides: Record<string, any> = {}) {
  return {
    id: 'ne-1',
    neId: 'NE-001',
    name: 'eNodeB-Algiers-01',
    type: 'eNodeB',
    technology: '4G',
    vendor: 'Ericsson',
    region: 'Algiers',
    siteName: 'Site A',
    status: 'active',
    lastPoll: now,
    cpuUsage: 45,
    memoryUsage: 62,
    carriers: 3,
    ...overrides,
  };
}

function makeFaultEvent(overrides: Record<string, any> = {}) {
  return {
    id: 'fe-1',
    faultId: 'FAULT-001',
    neId: 'NE-001',
    neName: 'eNodeB-Algiers-01',
    severity: 'major',
    description: 'CPU threshold exceeded',
    category: 'performance',
    timestamp: now,
    acknowledged: false,
    ...overrides,
  };
}

describe('GET /api/integrations/oss', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns elements, distributions, performance trend, faults, and summary', async () => {
    mockDb.ossNetworkElement.findMany.mockResolvedValue([makeNetworkElement()]);
    mockDb.ossFaultEvent.findMany.mockResolvedValue([makeFaultEvent()]);

    const req = new Request('http://localhost/api/integrations/oss');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.elements).toHaveLength(1);
    expect(data.neTypeDistribution).toBeDefined();
    expect(data.vendorDistribution).toBeDefined();
    expect(data.performanceTrend).toBeDefined();
    expect(data.faultEvents).toHaveLength(1);
    expect(data.summary).toBeDefined();
  });

  it('maps network element fields correctly', async () => {
    mockDb.ossNetworkElement.findMany.mockResolvedValue([makeNetworkElement()]);
    mockDb.ossFaultEvent.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/integrations/oss');
    const res = await GET(req);
    const data = await res.json();

    const el = data.elements[0];
    expect(el.neId).toBe('NE-001');
    expect(el.site).toBe('Site A'); // siteName mapped to site
    expect(el.lastPoll).toBeDefined();
    expect(el.cpuUsage).toBe(45);
    expect(el.memoryUsage).toBe(62);
  });

  it('maps fault event fields correctly', async () => {
    mockDb.ossNetworkElement.findMany.mockResolvedValue([]);
    mockDb.ossFaultEvent.findMany.mockResolvedValue([makeFaultEvent()]);

    const req = new Request('http://localhost/api/integrations/oss');
    const res = await GET(req);
    const data = await res.json();

    const fe = data.faultEvents[0];
    expect(fe.id).toBe('FAULT-001'); // faultId mapped to id
    expect(fe.neId).toBe('NE-001');
    expect(fe.acknowledged).toBe(false);
  });

  it('computes type and vendor distributions', async () => {
    mockDb.ossNetworkElement.findMany.mockResolvedValue([
      makeNetworkElement({ type: 'eNodeB', vendor: 'Ericsson' }),
      makeNetworkElement({ id: 'ne-2', type: 'eNodeB', vendor: 'Huawei' }),
      makeNetworkElement({ id: 'ne-3', type: 'gNodeB', vendor: 'Ericsson' }),
    ]);
    mockDb.ossFaultEvent.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/integrations/oss');
    const res = await GET(req);
    const data = await res.json();

    expect(data.neTypeDistribution).toContainEqual({ name: 'eNodeB', value: 2 });
    expect(data.neTypeDistribution).toContainEqual({ name: 'gNodeB', value: 1 });
    expect(data.vendorDistribution).toContainEqual({ name: 'Ericsson', count: 2 });
    expect(data.vendorDistribution).toContainEqual({ name: 'Huawei', count: 1 });
  });

  it('computes summary stats', async () => {
    mockDb.ossNetworkElement.findMany.mockResolvedValue([
      makeNetworkElement({ status: 'active' }),
      makeNetworkElement({ id: 'ne-2', status: 'degraded', cpuUsage: 80 }),
      makeNetworkElement({ id: 'ne-3', status: 'down', cpuUsage: 90, memoryUsage: 95 }),
    ]);
    mockDb.ossFaultEvent.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/integrations/oss');
    const res = await GET(req);
    const data = await res.json();

    expect(data.summary.total).toBe(3);
    expect(data.summary.active).toBe(1);
    expect(data.summary.degraded).toBe(1);
    expect(data.summary.down).toBe(1);
    expect(data.summary.avgCpu).toBe(Math.round((45 + 80 + 90) / 3));
    expect(data.summary.avgMemory).toBe(Math.round((62 + 62 + 95) / 3));
  });

  it('generates 24-hour performance trend', async () => {
    mockDb.ossNetworkElement.findMany.mockResolvedValue([makeNetworkElement()]);
    mockDb.ossFaultEvent.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/integrations/oss');
    const res = await GET(req);
    const data = await res.json();

    expect(data.performanceTrend).toHaveLength(24);
    for (const point of data.performanceTrend) {
      expect(point).toHaveProperty('time');
      expect(point).toHaveProperty('cpu');
      expect(point).toHaveProperty('memory');
      expect(point).toHaveProperty('throughput');
    }
  });

  it('handles empty data', async () => {
    mockDb.ossNetworkElement.findMany.mockResolvedValue([]);
    mockDb.ossFaultEvent.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/integrations/oss');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.elements).toHaveLength(0);
    expect(data.summary.total).toBe(0);
    expect(data.summary.avgCpu).toBe(0);
    expect(data.summary.avgMemory).toBe(0);
  });

  it('returns 500 on error', async () => {
    mockDb.ossNetworkElement.findMany.mockRejectedValue(new Error('DB error'));

    const req = new Request('http://localhost/api/integrations/oss');
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});
