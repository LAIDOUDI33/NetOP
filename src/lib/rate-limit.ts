/**
 * In-memory sliding-window rate limiter for API routes.
 * No external dependencies — uses a Map with automatic cleanup.
 *
 * Usage in a route handler:
 * ```ts
 * import { rateLimit } from '@/lib/rate-limit';
 * const { limited, remaining } = rateLimit(request, { windowMs: 60_000, max: 100 });
 * if (limited) return rateLimitResponse(remaining);
 * ```
 */

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimitConfig {
  /** Time window in milliseconds (default 60 000 = 1 min) */
  windowMs?: number;
  /** Max requests per window (default 100) */
  max?: number;
  /** Unique key override (defaults to IP) */
  key?: string;
}

interface RateLimitResult {
  limited: boolean;
  remaining: number;
  resetMs: number;
}

const store = new Map<string, RateLimitEntry>();

/** Garbage-collect stale entries every 2 minutes */
const GC_INTERVAL = 120_000;
let lastGc = Date.now();

function gc(now: number, windowMs: number) {
  if (now - lastGc < GC_INTERVAL) return;
  lastGc = now;
  const cutoff = now - windowMs;
  for (const [k, entry] of store) {
    // prune old timestamps
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(k);
  }
}

/**
 * Check rate limit for a request.
 * Returns { limited, remaining, resetMs }.
 */
export function rateLimit(
  request: Request,
  config: RateLimitConfig = {}
): RateLimitResult {
  const windowMs = config.windowMs ?? 60_000;
  const max = config.max ?? 100;

  // Derive client key: use explicit key or client IP
  const key = config.key ?? extractIp(request);
  const now = Date.now();
  const windowStart = now - windowMs;

  // Periodic GC
  gc(now, windowMs);

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Slide window — keep only recent timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  const remaining = Math.max(0, max - entry.timestamps.length);

  if (entry.timestamps.length >= max) {
    // Already at limit — don't add new timestamp
    const oldestInWindow = entry.timestamps[0];
    const resetMs = oldestInWindow + windowMs - now;
    return { limited: true, remaining: 0, resetMs };
  }

  // Allow request
  entry.timestamps.push(now);
  const oldestInWindow = entry.timestamps[0];
  const resetMs = oldestInWindow + windowMs - now;

  return {
    limited: false,
    remaining: remaining - 1, // -1 because we just used one
    resetMs,
  };
}

/**
 * Returns a 429 Too Many Requests response.
 */
export function rateLimitResponse(resetMs: number) {
  return new Response(
    JSON.stringify({
      error: 'Trop de requêtes',
      code: 'RATE_LIMITED',
      retry_after_ms: resetMs,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil(resetMs / 1000)),
        'X-RateLimit-Reset': String(resetMs),
      },
    }
  );
}

/** Extract client IP from request headers (works behind Caddy/proxy) */
function extractIp(request: Request): string {
  // Try common proxy headers
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  // Fallback for Node.js requests
  const req = request as unknown as { socket?: { remoteAddress?: string } };
  return req.socket?.remoteAddress ?? 'unknown';
}
