import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/assistant/query/route';
import { db } from '@/lib/db';

const mockDb = db as any;

// subscriberSegment is not in the global mock — add it locally
beforeEach(() => {
  if (!mockDb.subscriberSegment) {
    mockDb.subscriberSegment = {
      findMany: vi.fn().mockResolvedValue([]),
    };
  }
});

describe('POST /api/assistant/query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-ensure subscriberSegment mock after clearAllMocks
    if (!mockDb.subscriberSegment) {
      mockDb.subscriberSegment = { findMany: vi.fn().mockResolvedValue([]) };
    }
  });

  it('returns answer with data sources for a valid question', async () => {
    const req = new Request('http://localhost/api/assistant/query', {
      method: 'POST',
      body: JSON.stringify({ question: 'How many sites do we have?' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.answer).toBeDefined();
    expect(data.dataSource).toBeInstanceOf(Array);
    expect(data.confidence).toMatch(/^(low|medium|high)$/);
  });

  it('infers high confidence when multiple data sources match', async () => {
    const req = new Request('http://localhost/api/assistant/query', {
      method: 'POST',
      body: JSON.stringify({ question: 'What is the site alert kpi capacity churn anomaly status?' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.confidence).toBe('high');
  });

  it('returns 400 for missing question', async () => {
    const req = new Request('http://localhost/api/assistant/query', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 for empty question', async () => {
    const req = new Request('http://localhost/api/assistant/query', {
      method: 'POST',
      body: JSON.stringify({ question: '' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 500 on unexpected error', async () => {
    mockDb.networkSite.groupBy.mockRejectedValueOnce(new Error('DB crash'));

    const req = new Request('http://localhost/api/assistant/query', {
      method: 'POST',
      body: JSON.stringify({ question: 'test question' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req as any);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});
