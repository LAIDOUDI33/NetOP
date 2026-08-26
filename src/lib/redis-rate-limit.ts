import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (fallback when Redis is unavailable)
const memoryStore = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (entry.resetAt <= now) memoryStore.delete(key);
  }
}, 300_000);

let redisClient: any = null;
let redisAvailable = false;

/**
 * Initialize Redis connection (call once at startup)
 */
export async function initRedisRateLimit(): Promise<boolean> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return false;

  try {
    const { default: Redis } = await import('ioredis');
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    redisClient.on('error', () => { redisAvailable = false; });
    redisClient.on('ready', () => { redisAvailable = true; });

    await redisClient.connect();
    redisAvailable = true;
    console.log('[redis-rate-limit] Connected to Redis');
    return true;
  } catch (error: unknown) {
    console.warn(`[redis-rate-limit] Redis unavailable, using in-memory: ${error.message}`);
    return false;
  }
}

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  keyPrefix?: string;
}

interface RateLimitResult {
  limited: boolean;
  resetMs: number;
  remaining: number;
}

/**
 * Check rate limit using Redis (with in-memory fallback)
 */
export async function redisRateLimit(
  request: NextRequest,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const { windowMs = 60_000, max = 100, keyPrefix = 'rl' } = options;

  // Build identifier: IP or user fingerprint
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  const key = `${keyPrefix}:${ip}`;
  const now = Date.now();
  const windowEnd = now + windowMs;
  const __ttlSeconds = Math.ceil(windowMs / 1000);

  // Try Redis first
  if (redisAvailable && redisClient) {
    try {
      const current = await redisClient.incr(key);
      if (current === 1) {
        await redisClient.pexpire(key, windowMs);
      }
      const pttl = await redisClient.pttl(key);
      return {
        limited: current > max,
        resetMs: pttl > 0 ? pttl : windowMs,
        remaining: Math.max(0, max - current),
      };
    } catch {
      redisAvailable = false;
      // Fall through to memory
    }
  }

  // In-memory fallback
  const entry = memoryStore.get(key);
  if (!entry || entry.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: windowEnd });
    return { limited: max < 1, resetMs: windowMs, remaining: max - 1 };
  }

  entry.count++;
  return {
    limited: entry.count > max,
    resetMs: entry.resetAt - now,
    remaining: Math.max(0, max - entry.count),
  };
}

/**
 * Get a rate limit exceeded response with proper headers
 */
export function redisRateLimitResponse(resetMs: number, max = 100) {
  return NextResponse.json(
    { error: 'Too many requests', retryAfterMs: resetMs },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil(resetMs / 1000)),
        'X-RateLimit-Limit': String(max),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil((Date.now() + resetMs) / 1000)),
      },
    }
  );
}

/**
 * Check if Redis rate limiting is active
 */
export function isRedisRateLimitActive(): boolean {
  return redisAvailable;
}
