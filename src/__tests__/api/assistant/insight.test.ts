import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/assistant/insight/route';
import { db } from '@/lib/db';

const mockDb = db as any;

describe('POST /api/assistant/insight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns report for kpi domain', async () => {
    const req = new Request('http://localhost/api/assistant/insight', {
      method: 'POST',
      body: JSON.stringify({ domain: 'kpi' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.report).toBeDefined();
    expect(data.domain).toBe('kpi');
    expect(data.generatedAt).toBeDefined();
  });

  it('returns report for network domain', async () => {
    mockDb.healthScore.findMany.mockResolvedValueOnce([]);

    const req = new Request('http://localhost/api/assistant/insight', {
      method: 'POST',
      body: JSON.stringify({ domain: 'network' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.domain).toBe('network');
  });

  it('returns 400 for invalid domain', async () => {
    const req = new Request('http://localhost/api/assistant/insight', {
      method: 'POST',
      body: JSON.stringify({ domain: 'invalid' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing domain', async () => {
    const req = new Request('http://localhost/api/assistant/insight', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 500 on error', async () => {
    mockDb.kpiMetric.aggregate.mockRejectedValueOnce(new Error('DB fail'));

    const req = new Request('http://localhost/api/assistant/insight', {
      method: 'POST',
      body: JSON.stringify({ domain: 'kpi' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req as any);
    expect(res.status).toBe(500);
  });
});
