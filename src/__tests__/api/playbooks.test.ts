import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockDb, makeNextRequest } from './mock-db';

const { mockDb } = vi.hoisted(() => ({ mockDb: createMockDb() }));
vi.mock('@/lib/db', () => ({ db: mockDb }));

import { GET } from '@/app/api/playbooks/route';

describe('GET /api/playbooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with playbooks array and summary', async () => {
    const res = await GET(makeNextRequest('/api/playbooks'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('playbooks');
    expect(body).toHaveProperty('summary');
    expect(Array.isArray(body.playbooks)).toBe(true);
    expect(body.summary).toHaveProperty('total');
    expect(body.summary).toHaveProperty('byCategory');
    expect(body.summary).toHaveProperty('avgSteps');
    expect(body.summary).toHaveProperty('avgSuccessRate');
    expect(body.summary).toHaveProperty('totalUsage');
  });

  it('passes category filter', async () => {
    await GET(makeNextRequest('/api/playbooks?category=outage'));
    expect(mockDb.playbook.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ category: 'outage' }),
      }),
    );
  });

  it('passes technology filter', async () => {
    await GET(makeNextRequest('/api/playbooks?technology=4G'));
    expect(mockDb.playbook.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ technology: '4G' }),
      }),
    );
  });

  it('includes steps relation ordered by stepNumber', async () => {
    await GET(makeNextRequest('/api/playbooks'));
    expect(mockDb.playbook.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          steps: expect.objectContaining({
            orderBy: { stepNumber: 'asc' },
          }),
        }),
      }),
    );
  });

  it('returns zero summary for empty results', async () => {
    const res = await GET(makeNextRequest('/api/playbooks'));
    const body = await res.json();
    expect(body.summary.total).toBe(0);
    expect(body.summary.avgSteps).toBe(0);
    expect(body.summary.avgSuccessRate).toBe(0);
  });
});
