/**
 * Cache helpers — wraps ProductionCache with common patterns and
 * pre-configured instances for each domain.
 */

import { ProductionCache } from './cache';

// ─── cachedQuery ─────────────────────────────────────────────────────────────

/**
 * Check the cache first; on miss, run `queryFn`, store the result, and return it.
 *
 * @param cache   The ProductionCache instance to use
 * @param key     Cache key
 * @param ttlMs   TTL in milliseconds
 * @param queryFn Async function that produces the data
 */
export async function cachedQuery<T>(
  cache: ProductionCache<T>,
  key: string,
  ttlMs: number,
  queryFn: () => Promise<T>,
): Promise<T> {
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const result = await queryFn();
  cache.set(key, result, ttlMs);
  return result;
}

// ─── Pre-configured cache instances ──────────────────────────────────────────

/** Dashboard overview data — 15 s TTL, max 100 entries */
export const dashboardCache = new ProductionCache<unknown>({
  defaultTtlMs: 15_000,
  maxSize: 100,
});

/** KPI metrics — 10 s TTL, max 500 entries */
export const kpiCache = new ProductionCache<unknown>({
  defaultTtlMs: 10_000,
  maxSize: 500,
});

/** Alert feeds — 5 s TTL, max 200 entries */
export const alertCache = new ProductionCache<unknown>({
  defaultTtlMs: 5_000,
  maxSize: 200,
});

/** Analytics / reporting — 30 s TTL, max 200 entries */
export const analyticsCache = new ProductionCache<unknown>({
  defaultTtlMs: 30_000,
  maxSize: 200,
});

/** AI prediction results — 60 s TTL, max 100 entries */
export const predictionCache = new ProductionCache<unknown>({
  defaultTtlMs: 60_000,
  maxSize: 100,
});
