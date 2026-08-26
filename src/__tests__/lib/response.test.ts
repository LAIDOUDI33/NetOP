import { describe, it, expect, vi } from 'vitest';

// Mock next/server's NextResponse
vi.mock('next/server', () => {
  return {
    NextResponse: {
      json: (body: unknown, init?: ResponseInit) => {
        return new Response(JSON.stringify(body), {
          status: init?.status ?? 200,
          headers: { 'Content-Type': 'application/json', ...init?.headers },
        });
      },
    },
  };
});

vi.mock('@/lib/errors', () => ({
  handleApiError: (err: unknown) => {
    return new Response(JSON.stringify({ error: { code: 'TEST_ERROR', message: String(err), requestId: 'test-rid' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  },
}));

import { success, paginated, error } from '@/lib/response';

describe('success', () => {
  it('wraps data in success envelope', async () => {
    const res = success({ items: [1, 2, 3] });
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.data).toEqual({ items: [1, 2, 3] });
  });

  it('includes optional meta', async () => {
    const res = success([1, 2], { cacheHit: true });
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.data).toEqual([1, 2]);
    expect(data.meta).toEqual({ cacheHit: true });
  });

  it('returns 200 status', () => {
    const res = success(null);
    expect(res.status).toBe(200);
  });

  it('omits meta when not provided', async () => {
    const res = success('hello');
    const data = await res.json();
    expect(data.meta).toBeUndefined();
  });
});

describe('paginated', () => {
  it('wraps data in paginated envelope', async () => {
    const res = paginated([1, 2, 3], 50, 1, 10);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.data).toEqual([1, 2, 3]);
    expect(data.pagination).toBeDefined();
    expect(data.pagination.total).toBe(50);
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.pageSize).toBe(10);
  });

  it('computes pagination metadata', async () => {
    const res = paginated([], 95, 5, 10);
    const data = await res.json();

    expect(data.pagination.totalPages).toBe(10);
    expect(data.pagination.hasNext).toBe(true);
    expect(data.pagination.hasPrev).toBe(true);
  });

  it('handles last page', async () => {
    const res = paginated([], 30, 3, 10);
    const data = await res.json();

    expect(data.pagination.hasNext).toBe(false);
    expect(data.pagination.hasPrev).toBe(true);
  });

  it('handles first page', async () => {
    const res = paginated([], 30, 1, 10);
    const data = await res.json();

    expect(data.pagination.hasNext).toBe(true);
    expect(data.pagination.hasPrev).toBe(false);
  });

  it('totalPages is at least 1', async () => {
    const res = paginated([], 0, 1, 10);
    const data = await res.json();

    expect(data.pagination.totalPages).toBe(1);
    expect(data.pagination.hasNext).toBe(false);
  });
});

describe('error', () => {
  it('delegates to handleApiError', async () => {
    const res = error(new Error('test error'));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error.code).toBe('TEST_ERROR');
  });

  it('handles non-Error values', async () => {
    const res = error('string error');
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error.message).toBe('string error');
  });
});
