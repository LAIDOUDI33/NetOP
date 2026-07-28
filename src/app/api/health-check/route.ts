import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

const startTime = Date.now();

/**
 * Unauthenticated health-check endpoint for load balancers and monitoring tools.
 * Returns 200 OK with service status, uptime, and DB connectivity.
 * NO JWT required — this must be reachable by infrastructure probes.
 */
export async function GET(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);
  const now = new Date();
  let dbStatus: 'ok' | 'degraded' | 'down' = 'ok';
  let dbLatencyMs = 0;

  // Probe database connectivity
  try {
    const t0 = Date.now();
    await db.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - t0;
  } catch {
    dbStatus = 'down';
  }

  const uptimeMs = Date.now() - startTime;

  return NextResponse.json({
    status: dbStatus === 'down' ? 'unhealthy' : 'healthy',
    timestamp: now.toISOString(),
    version: process.env.npm_package_version ?? '0.2.0',
    uptime_ms: uptimeMs,
    services: {
      api: 'ok',
      database: dbStatus,
      db_latency_ms: dbLatencyMs,
    },
  }, {
    status: dbStatus === 'down' ? 503 : 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
