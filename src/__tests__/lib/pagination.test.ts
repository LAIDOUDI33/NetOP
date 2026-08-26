import { describe, it, expect } from 'vitest';
import { parsePagination, paginationMeta, paginatedResponse } from '@/lib/pagination';

describe('parsePagination', () => {
  it('returns defaults when no params provided', () => {
    const params = new URLSearchParams();
    const result = parsePagination(params);

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(50);
  });

  it('parses page and pageSize from query params', () => {
    const params = new URLSearchParams('page=3&pageSize=20');
    const result = parsePagination(params);

    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(20);
    expect(result.skip).toBe(40); // (3-1) * 20
    expect(result.take).toBe(20);
  });

  it('also accepts "limit" as pageSize alias', () => {
    const params = new URLSearchParams('page=2&limit=25');
    const result = parsePagination(params);

    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(25);
    expect(result.skip).toBe(25); // (2-1) * 25
  });

  it('clamps page to minimum 1', () => {
    const params = new URLSearchParams('page=0&pageSize=10');
    const result = parsePagination(params);
    expect(result.page).toBe(1);

    const params2 = new URLSearchParams('page=-5');
    const result2 = parsePagination(params2);
    expect(result2.page).toBe(1);
  });

  it('clamps pageSize to minimum 1', () => {
    const params = new URLSearchParams('pageSize=0');
    const result = parsePagination(params);
    expect(result.pageSize).toBe(50); // falls to default

    const params2 = new URLSearchParams('pageSize=-10');
    const result2 = parsePagination(params2);
    expect(result2.pageSize).toBe(50);
  });

  it('respects maxPageSize', () => {
    const params = new URLSearchParams('pageSize=1000');
    const result = parsePagination(params, { maxPageSize: 100 });
    expect(result.pageSize).toBe(100);
  });

  it('respects custom defaultPageSize', () => {
    const params = new URLSearchParams();
    const result = parsePagination(params, { defaultPageSize: 10 });
    expect(result.pageSize).toBe(10);
  });

  it('custom defaultPageSize is clamped by maxPageSize', () => {
    const params = new URLSearchParams();
    const result = parsePagination(params, { defaultPageSize: 200, maxPageSize: 100 });
    expect(result.pageSize).toBe(100);
  });

  it('handles NaN gracefully', () => {
    const params = new URLSearchParams('page=abc&pageSize=def');
    const result = parsePagination(params);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
  });
});

describe('paginationMeta', () => {
  it('computes meta for first page', () => {
    const params = { page: 1, pageSize: 10, skip: 0, take: 10 };
    const meta = paginationMeta(95, params);

    expect(meta.page).toBe(1);
    expect(meta.pageSize).toBe(10);
    expect(meta.totalItems).toBe(95);
    expect(meta.totalPages).toBe(10);
    expect(meta.hasNext).toBe(true);
    expect(meta.hasPrev).toBe(false);
  });

  it('computes meta for middle page', () => {
    const params = { page: 5, pageSize: 10, skip: 40, take: 10 };
    const meta = paginationMeta(95, params);

    expect(meta.page).toBe(5);
    expect(meta.hasNext).toBe(true);
    expect(meta.hasPrev).toBe(true);
  });

  it('computes meta for last page', () => {
    const params = { page: 10, pageSize: 10, skip: 90, take: 10 };
    const meta = paginationMeta(95, params);

    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrev).toBe(true);
  });

  it('computes meta for empty results', () => {
    const params = { page: 1, pageSize: 10, skip: 0, take: 10 };
    const meta = paginationMeta(0, params);

    expect(meta.totalPages).toBe(1);
    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrev).toBe(false);
  });

  it('totalPages is at least 1', () => {
    const params = { page: 1, pageSize: 10, skip: 0, take: 10 };
    const meta = paginationMeta(0, params);
    expect(meta.totalPages).toBe(1);
  });

  it('handles exact page boundary', () => {
    const params = { page: 3, pageSize: 10, skip: 20, take: 10 };
    const meta = paginationMeta(30, params);

    expect(meta.totalPages).toBe(3);
    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrev).toBe(true);
  });
});

describe('paginatedResponse', () => {
  it('wraps items with success and meta', () => {
    const params = { page: 1, pageSize: 10, skip: 0, take: 10 };
    const items = [{ id: 1 }, { id: 2 }];
    const result = paginatedResponse(items, 50, params);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(items);
    expect(result.meta).toBeDefined();
    expect(result.meta.totalItems).toBe(50);
  });

  it('handles empty items', () => {
    const params = { page: 1, pageSize: 10, skip: 0, take: 10 };
    const result = paginatedResponse([], 0, params);

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
    expect(result.meta.totalItems).toBe(0);
  });
});
