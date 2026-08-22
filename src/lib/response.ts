/**
 * Standardized API response helpers for the NetOP NOC platform.
 *
 * All API routes should return responses via these helpers to ensure
 * a consistent JSON envelope across the entire application.
 */

import { NextResponse } from 'next/server';
import { handleApiError } from './errors';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SuccessBody<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

interface PaginatedBody<T> {
  success: true;
  data: T;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Wrap a successful response in a standard envelope.
 *
 * @param data  The response payload
 * @param meta Optional metadata (e.g. cache hit, timing info)
 */
export function success<T>(
  data: T,
  meta?: Record<string, unknown>,
): NextResponse<SuccessBody<T>> {
  return NextResponse.json({ success: true, data, meta });
}

/**
 * Wrap a paginated response in a standard envelope with pagination metadata.
 *
 * @param data     The page of items
 * @param total    Total item count across all pages
 * @param page     Current page number (1-based)
 * @param pageSize Number of items per page
 */
export function paginated<T>(
  data: T,
  total: number,
  page: number,
  pageSize: number,
): NextResponse<PaginatedBody<T>> {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return NextResponse.json({
    success: true,
    data,
    pagination: {
      total,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
}

/**
 * Return a standardized error response.
 * Delegates to `handleApiError` from the errors module.
 */
export function error(err: unknown) {
  return handleApiError(err);
}
