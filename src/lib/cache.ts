/**
 * ProductionCache — In-memory LRU cache with per-entry TTL support.
 *
 * Designed for server-side use in Next.js API routes and server actions.
 * Provides thread-safe async access via a simple lock flag.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  key: string;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
}

export class ProductionCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private defaultTtlMs: number;
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private _locked = false;

  constructor(options?: { maxSize?: number; defaultTtlMs?: number }) {
    this.maxSize = options?.maxSize ?? 500;
    this.defaultTtlMs = options?.defaultTtlMs ?? 30_000;
  }

  /**
   * Retrieve a cached value. Returns undefined if the key is missing or expired.
   * Does NOT extend the TTL on read (use `set` to refresh).
   */
  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }

    // LRU: move to most-recently-used by re-inserting
    this.store.delete(key);
    this.store.set(key, entry);
    this.hits++;
    return entry.value;
  }

  /**
   * Store a value in the cache with an optional custom TTL.
   * Evicts the least-recently-used entry if the cache is full.
   */
  set(key: string, value: T, ttlMs?: number): void {
    // Remove existing entry first to update ordering
    if (this.store.has(key)) {
      this.store.delete(key);
    }

    // Evict LRU entries if at capacity
    while (this.store.size >= this.maxSize) {
      const lruKey = this.store.keys().next().value;
      if (lruKey !== undefined) {
        this.store.delete(lruKey);
        this.evictions++;
      } else {
        break;
      }
    }

    const ttl = ttlMs ?? this.defaultTtlMs;
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      key,
    });
  }

  /** Remove a single key from the cache. */
  invalidate(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Remove all keys matching the given prefix.
   * Useful for cache busting when underlying data changes.
   */
  invalidatePattern(prefix: string): number {
    let removed = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        removed++;
      }
    }
    return removed;
  }

  /** Clear all entries and reset stats. */
  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Check if a key exists and is not expired.
   * Does NOT update LRU order or extend TTL.
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  /** Return cache performance statistics. */
  stats(): CacheStats {
    // Purge expired entries before reporting size
    this.purgeExpired();

    const total = this.hits + this.misses;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      evictions: this.evictions,
    };
  }

  /** Current number of entries (including potentially expired ones). */
  get size(): number {
    return this.store.size;
  }

  /**
   * Acquire a simple async lock. Useful when a cache miss triggers
   * an expensive async operation and you want to avoid stampede.
   *
   * Usage:
   *   if (cache.acquireLock()) {
   *     try { const data = await expensiveOp(); cache.set(key, data); }
   *     finally { cache.releaseLock(); }
   *   }
   */
  acquireLock(): boolean {
    if (this._locked) return false;
    this._locked = true;
    return true;
  }

  releaseLock(): void {
    this._locked = false;
  }

  /** Internal: remove all expired entries. */
  private purgeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}
