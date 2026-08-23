import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockDb, makeNextRequest } from './mock-db';

const { mockDb } = vi.hoisted(() => ({ mockDb: createMockDb() }));
vi.mock('@/lib/db', () => ({ db: mockDb }));

import { GET } from '@/app/api/subscribers/route';

describe('GET /api/subscribers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with segments array and summary', async () => {
    const res = await GET(makeNextRequest('/api/subscribers'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('segments');
    expect(body).toHaveProperty('summary');
    expect(Array.isArray(body.segments)).toBe(true);
    expect(body.summary).toHaveProperty('totalSegments');
    expect(body.summary).toHaveProperty('totalSubscribers');
    expect(body.summary).toHaveProperty('totalARPU');
    expect(body.summary).toHaveProperty('avgChurnRisk');
    expect(body.summary).toHaveProperty('byTech');
  });

  it('passes technology filter', async () => {
    await GET(makeNextRequest('/api/subscribers?technology=4G'));
    expect(mockDb.subscriberSegment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ technology: '4G' }),
      }),
    );
  });

  it('returns zero summary for empty results', async () => {
    const res = await GET(makeNextRequest('/api/subscribers'));
    const body = await res.json();
    expect(body.summary.totalSegments).toBe(0);
    expect(body.summary.totalSubscribers).toBe(0);
    expect(body.summary.avgChurnRisk).toBe(0);
  });

  it('orders by subscriberCount desc', async () => {
    await GET(makeNextRequest('/api/subscribers'));
    expect(mockDb.subscriberSegment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { subscriberCount: 'desc' },
      }),
    );
  });
});
