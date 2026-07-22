import { NextRequest, NextResponse } from 'next/server';

// ──────────────────────────────────────────────
// In-memory sliding-window rate limiter for API
// ──────────────────────────────────────────────

interface Bucket {
  ts: number[];
}

const store = new Map<string, Bucket>();
const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 120;
let lastGc = Date.now();

function gc(now: number) {
  if (now - lastGc < 120_000) return;
  lastGc = now;
  const cutoff = now - WINDOW_MS;
  for (const [k, b] of store) {
    b.ts = b.ts.filter((t) => t > cutoff);
    if (b.ts.length === 0) store.delete(k);
  }
}

function getClientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}

function checkRateLimit(request: NextRequest): { limited: boolean; remaining: number; resetMs: number } {
  const ip = getClientIp(request);
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  gc(now);

  let bucket = store.get(ip);
  if (!bucket) {
    bucket = { ts: [] };
    store.set(ip, bucket);
  }

  bucket.ts = bucket.ts.filter((t) => t > windowStart);

  if (bucket.ts.length >= MAX_REQUESTS) {
    const oldest = bucket.ts[0];
    return { limited: true, remaining: 0, resetMs: oldest + WINDOW_MS - now };
  }

  bucket.ts.push(now);
  const remaining = Math.max(0, MAX_REQUESTS - bucket.ts.length - 1);
  const oldest = bucket.ts[0];
  const resetMs = oldest + WINDOW_MS - now;

  return { limited: false, remaining, resetMs };
}

// ──────────────────────────────────────────────
// Next.js Middleware
// ──────────────────────────────────────────────

// Skip rate-limit for health-check (infrastructure probes) and NextAuth internals
const SKIP_PATHS = ['/api/health-check', '/api/auth/'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply to /api/ routes
  if (!pathname.startsWith('/api/')) return;

  // Skip unauthenticated probes and auth flows
  for (const skip of SKIP_PATHS) {
    if (pathname.startsWith(skip)) return;
  }

  const { limited, remaining, resetMs } = checkRateLimit(request);

  if (limited) {
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
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(resetMs),
        },
      }
    );
  }

  // Inject rate-limit headers into the response
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(MAX_REQUESTS));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', String(resetMs));
  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
