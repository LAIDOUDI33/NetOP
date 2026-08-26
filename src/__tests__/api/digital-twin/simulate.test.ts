import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/digital-twin/simulate/route';
import { db } from '@/lib/db';

const mockDb = db as any;

// simulationResult not in global mock
beforeEach(() => {
  mockDb.simulationResult = {
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    createMany: vi.fn().mockResolvedValue({}),
  };
});

describe('POST /api/digital-twin/simulate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.simulationResult = {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({}),
    };
  });

  it('returns 400 when scenarioId is missing', async () => {
    const req = new Request('http://localhost/api/digital-twin/simulate', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/scenarioId/i);
  });

  it('returns 404 when scenario not found', async () => {
    mockDb.digitalTwinScenario.findUnique.mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/digital-twin/simulate', {
      method: 'POST',
      body: JSON.stringify({ scenarioId: 'nonexistent' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req as any);
    expect(res.status).toBe(404);
  });

  it('runs simulation and returns results using deterministic fallback', async () => {
    mockDb.digitalTwinScenario.findUnique.mockResolvedValueOnce({
      id: 'ds-1', scenarioType: 'disaster', parameters: '{"severity":"moderate"}',
      targetSiteId: null, results: null,
    });
    mockDb.digitalTwinScenario.update.mockResolvedValueOnce({
      id: 'ds-1', scenarioType: 'disaster', status: 'simulated', impactScore: -20,
      simulationResults: [],
    });

    const req = new Request('http://localhost/api/digital-twin/simulate', {
      method: 'POST',
      body: JSON.stringify({ scenarioId: 'ds-1' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.scenario).toBeDefined();
  });

  it('returns 500 on error', async () => {
    mockDb.digitalTwinScenario.findUnique.mockRejectedValueOnce(new Error('DB fail'));

    const req = new Request('http://localhost/api/digital-twin/simulate', {
      method: 'POST',
      body: JSON.stringify({ scenarioId: 'ds-1' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req as any);
    expect(res.status).toBe(500);
  });
});
