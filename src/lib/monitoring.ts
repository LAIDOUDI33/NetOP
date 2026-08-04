/**
 * Simple health check & metrics collector for server-side code.
 * Uses in-memory counters for request tracking and process.memoryUsage() for memory stats.
 */

// In-memory request metrics
let totalRequests = 0;
let errorCount = 0;
let totalResponseTime = 0;

/**
 * Record an API request for metrics tracking.
 * @param durationMs - Response time in milliseconds
 * @param isError - Whether the request resulted in an error
 */
export function recordRequest(durationMs: number, isError: boolean): void {
  totalRequests++;
  totalResponseTime += durationMs;
  if (isError) errorCount++;
}

/**
 * Get system health information.
 */
export function getSystemHealth(): {
  status: string;
  uptime: number;
  memory: ReturnType<typeof process.memoryUsage>;
  version: string;
  timestamp: string;
} {
  const mem = process.memoryUsage();
  return {
    status: 'ok',
    uptime: process.uptime(),
    memory: mem,
    version: process.env.npm_package_version ?? '0.2.0',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get request metrics (total, errors, average response time).
 */
export function getMetrics(): {
  totalRequests: number;
  errorCount: number;
  avgResponseTime: number;
} {
  return {
    totalRequests,
    errorCount,
    avgResponseTime: totalRequests > 0 ? Math.round(totalResponseTime / totalRequests) : 0,
  };
}
