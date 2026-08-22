/**
 * Standardized pagination utilities for API routes.
 * Provides consistent query parameter parsing, Prisma skip/take,
 * and response metadata generation.
 */

export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 500;

/**
 * Parse pagination params from URL search params.
 * Returns validated page/pageSize along with computed skip/take for Prisma.
 */
export function parsePagination(searchParams: URLSearchParams, opts?: { defaultPageSize?: number; maxPageSize?: number }): PaginationParams {
  const max = opts?.maxPageSize ?? MAX_PAGE_SIZE;
  const defaultSize = Math.min(opts?.defaultPageSize ?? DEFAULT_PAGE_SIZE, max);

  let page = parseInt(searchParams.get('page') || '', 10);
  let pageSize = parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '', 10);

  if (isNaN(page) || page < 1) page = DEFAULT_PAGE;
  if (isNaN(pageSize) || pageSize < 1) pageSize = defaultSize;
  if (pageSize > max) pageSize = max;

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

/**
 * Build pagination metadata to include in API responses.
 */
export function paginationMeta(totalItems: number, params: PaginationParams): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(totalItems / params.pageSize));
  return {
    page: params.page,
    pageSize: params.pageSize,
    totalItems,
    totalPages,
    hasNext: params.page < totalPages,
    hasPrev: params.page > 1,
  };
}

/**
 * Wrap paginated data in a standard response shape.
 * Usage: return NextResponse.json(paginatedResponse(items, total, pagination));
 */
export function paginatedResponse<T>(items: T[], totalItems: number, params: PaginationParams) {
  return {
    success: true,
    data: items,
    meta: paginationMeta(totalItems, params),
  };
}
