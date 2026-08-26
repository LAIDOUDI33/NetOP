import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/services/route';
import { db } from '@/lib/db';

const mockDb = db as any;

// serviceOrchestration not in global mock
beforeEach(() => {
  mockDb.serviceOrchestration = { findMany: vi.fn().mockResolvedValue([]) };
});

describe('GET /api/services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.serviceOrchestration = { findMany: vi.fn().mockResolvedValue([]) };
  });

  it('returns empty services with default summary', async () => {
    const req = new Request('http://localhost/api/services');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.services).toEqual([]);
    expect(data.summary.total).toBe(0);
    expect(data.summary.slaComplianceRate).toBe(0);
  });

  it('returns mapped services with computed summary', async () => {
    mockDb.serviceOrchestration.findMany.mockResolvedValueOnce([
      {
        id: 'so-1', serviceName: 'VoLTE', serviceType: 'voice', technology: '4G',
        region: 'Algiers', mosScore: 4.2, latencyMs: 15, jitterMs: 3, packetLoss: 0.01,
        throughputMbps: 50, availabilityPct: 99.9, userSatisfaction: 4.5,
        activeSessions: 1200, kpiViolations: 2, slaCompliant: true,
        issues: '["none"]', timestamp: new Date(), createdAt: new Date(),
      },
      {
        id: 'so-2', serviceName: 'Video', serviceType: 'data', technology: '4G',
        region: 'Algiers', mosScore: 3.5, latencyMs: 25, jitterMs: 8, packetLoss: 0.05,
        throughputMbps: 100, availabilityPct: 98.5, userSatisfaction: 3.8,
        activeSessions: 800, kpiViolations: 5, slaCompliant: false,
        issues: '["buffering"]', timestamp: new Date(), createdAt: new Date(),
      },
    ]);

    const req = new Request('http://localhost/api/services');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.services).toHaveLength(2);
    expect(data.summary.total).toBe(2);
    expect(data.summary.slaBreaches).toBe(1);
    expect(data.summary.slaComplianceRate).toBe(50);
  });

  it('filters by serviceType and technology', async () => {
    mockDb.serviceOrchestration.findMany.mockResolvedValueOnce([]);

    const req = new Request('http://localhost/api/services?serviceType=voice&technology=5G');
    const res = await GET(req as any);

    expect(res.status).toBe(200);
    expect(mockDb.serviceOrchestration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { serviceType: 'voice', technology: '5G' } }),
    );
  });

  it('returns 500 on error', async () => {
    mockDb.serviceOrchestration.findMany.mockRejectedValueOnce(new Error('DB fail'));

    const req = new Request('http://localhost/api/services');
    const res = await GET(req as any);

    expect(res.status).toBe(500);
  });
});
