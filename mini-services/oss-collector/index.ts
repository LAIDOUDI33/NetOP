// ============================================================================
// oss-collector — Main Entry Point
// Multi-vendor OSS data collection microservice for Djezzy NOC (NetOP)
// Runs on port 3005
// ============================================================================

import { initDb, seedDefaultSourcesAsync, getAllSources, createSource, deleteSource, getMetrics, getTotalMetricsCount, getTotalErrorCount, getLastCollectionRun, getDbSizeBytes, getSourceCountByVendor, getLastCollectionByVendor } from './db';
import { collectFromSource, collectAll, startScheduler, isSchedulerActive, getCircuitBreakerStates } from './scheduler';
import { getAllAdapters } from './adapters';
import type { CreateSourceInput, HealthResponse, CollectorStatusResponse, VendorInfo, ApiResponse, PaginatedResponse, CircuitBreakerState } from './types';
import { SUPPORTED_VENDORS } from './types';

const VERSION = '1.0.0';
const PORT = 3005;
const START_TIME = Date.now();

// ---- JSON Helpers ----

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Powered-By': 'NetOP-oss-collector',
    },
  });
}

function ok(data: unknown): Response {
  return json({ ok: true, data, timestamp: new Date().toISOString() } as ApiResponse);
}

function err(msg: string, status = 400): Response {
  return json({ ok: false, error: msg, timestamp: new Date().toISOString() } as ApiResponse, status);
}

function paginated(data: unknown[], page: number, pageSize: number, total: number): Response {
  const totalPages = Math.ceil(total / pageSize);
  return json({
    ok: true,
    data,
    pagination: { page, pageSize, total, totalPages },
    timestamp: new Date().toISOString(),
  } as PaginatedResponse<unknown>);
}

// ---- Request Parsing ----

function getPathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function getQueryParams(url: string): Record<string, string> {
  try {
    const u = new URL(url);
    const params: Record<string, string> = {};
    u.searchParams.forEach((v, k) => { params[k] = v; });
    return params;
  } catch {
    return {};
  }
}

function matchRoute(pathname: string, pattern: string): Record<string, string> | null {
  const pathParts = pathname.split('/').filter(Boolean);
  const patternParts = pattern.split('/').filter(Boolean);

  if (pathParts.length !== patternParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

// ---- Route Handlers ----

async function handleHealth(): Promise<Response> {
  const uptime = Date.now() - START_TIME;
  const cbStates = getCircuitBreakerStates();
  const sourceCounts = getSourceCountByVendor();
  const adapters = getAllAdapters();

  const vendorStatuses = SUPPORTED_VENDORS.map((vendor) => {
    const count = sourceCounts[vendor];
    const lastColl = getLastCollectionByVendor(vendor);

    // Find circuit breaker for this vendor (check all sources of this vendor)
    let worstState: 'connected' | 'degraded' | 'disconnected' | 'unconfigured' = 'unconfigured';
    let relevantCb: CircuitBreakerState | null = null;

    if (count > 0) {
      worstState = 'connected';
      for (const [, breaker] of cbStates) {
        const state = breaker.getState();
        if (state.state === 'open') {
          worstState = 'disconnected';
          relevantCb = state;
          break;
        } else if (state.state === 'half_open') {
          worstState = 'degraded';
          relevantCb = state;
        }
      }
    }

    return {
      vendor,
      status: worstState,
      circuitBreaker: relevantCb,
      sourcesCount: count,
      lastCollection: lastColl,
    };
  });

  // Determine overall health
  const hasDisconnected = vendorStatuses.some((v) => v.status === 'disconnected');
  const hasDegraded = vendorStatuses.some((v) => v.status === 'degraded');
  const hasAnySource = vendorStatuses.some((v) => v.sourcesCount > 0);

  let overallStatus: HealthResponse['status'] = 'healthy';
  if (hasDisconnected) overallStatus = 'unhealthy';
  else if (hasDegraded) overallStatus = 'degraded';
  else if (!hasAnySource) overallStatus = 'degraded';

  const health: HealthResponse = {
    status: overallStatus,
    uptime,
    version: VERSION,
    vendors: vendorStatuses,
  };

  return json(health);
}

async function handleGetSources(): Promise<Response> {
  const sources = getAllSources();
  return ok(sources);
}

async function handleCreateSource(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as CreateSourceInput;

    // Validate required fields
    if (!body.name || !body.vendor || !body.host || !body.username || !body.password) {
      return err('Missing required fields: name, vendor, host, username, password');
    }

    if (!SUPPORTED_VENDORS.includes(body.vendor)) {
      return err(`Unsupported vendor: ${body.vendor}. Supported: ${SUPPORTED_VENDORS.join(', ')}`);
    }

    // Validate port range
    if (body.port !== undefined && (body.port < 1 || body.port > 65535)) {
      return err('Port must be between 1 and 65535');
    }

    // Validate polling interval
    if (body.pollingIntervalSec !== undefined && body.pollingIntervalSec < 10) {
      return err('Polling interval must be at least 10 seconds');
    }

    const source = await createSource(body);
  return ok(source);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(`Failed to create source: ${msg}`, 500);
  }
}

async function handleDeleteSource(params: Record<string, string>): Promise<Response> {
  const { id } = params;
  if (!id) return err('Missing source ID');

  const deleted = deleteSource(id);
  if (!deleted) return err(`Source ${id} not found`, 404);

  return ok({ deleted: true, id });
}

async function handleCollectSource(params: Record<string, string>): Promise<Response> {
  const { sourceId } = params;
  if (!sourceId) return err('Missing source ID');

  try {
    const result = await collectFromSource(sourceId);
    return ok(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(`Collection failed: ${msg}`, 500);
  }
}

async function handleCollectAll(): Promise<Response> {
  try {
    const result = await collectAll();
    return ok(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(`Collection failed: ${msg}`, 500);
  }
}

async function handleGetMetrics(query: Record<string, string>): Promise<Response> {
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '50', 10) || 50));

  const { metrics, total } = getMetrics(page, pageSize);
  return paginated(metrics, page, pageSize, total);
}

async function handleStatus(): Promise<Response> {
  const totalSources = getAllSources().length;
  const totalMetrics = getTotalMetricsCount();
  const totalErrors = getTotalErrorCount();
  const lastRun = getLastCollectionRun();
  const dbSize = getDbSizeBytes();
  const uptime = Date.now() - START_TIME;

  const status: CollectorStatusResponse = {
    totalSources,
    enabledSources: 0, // Will be computed
    totalMetricsCollected: totalMetrics,
    totalErrors,
    lastCollectionRun: lastRun?.startedAt ?? null,
    schedulerActive: isSchedulerActive(),
    uptime,
    dbSizeBytes: dbSize,
  };

  // Count enabled sources
  const sources = getAllSources();
  status.enabledSources = sources.filter((s) => s.enabled).length;

  return json(status);
}

async function handleGetVendors(): Promise<Response> {
  const adapters = getAllAdapters();
  const cbStates = getCircuitBreakerStates();
  const sourceCounts = getSourceCountByVendor();

  const vendors: VendorInfo[] = SUPPORTED_VENDORS.map((vendor) => {
    const adapter = adapters[vendor];
    const count = sourceCounts[vendor];
    const lastColl = getLastCollectionByVendor(vendor);

    // Determine aggregate circuit breaker state for this vendor
    let cbState: CircuitBreakerState | null = null;
    let vendorStatus: VendorInfo['status'] = 'idle';

    if (count > 0) {
      vendorStatus = 'active';
      for (const [, breaker] of cbStates) {
        const state = breaker.getState();
        if (state.state === 'open') {
          vendorStatus = 'down';
          cbState = state;
          break;
        } else if (state.state === 'half_open') {
          vendorStatus = 'degraded';
          if (!cbState || cbState.state !== 'open') cbState = state;
        }
      }
    }

    return {
      vendor,
      displayName: adapter.displayName,
      supportedProtocols: adapter.supportedProtocols,
      defaultProtocol: adapter.defaultProtocol,
      sourcesCount: count,
      circuitBreaker: cbState,
      status: vendorStatus,
    };
  });

  return ok(vendors);
}

// ---- Router ----

async function handleRequest(req: Request): Promise<Response> {
  const url = req.url;
  const pathname = getPathname(url);
  const query = getQueryParams(url);
  const method = req.method;

  try {
    // GET /health
    if (method === 'GET' && pathname === '/health') {
      return await handleHealth();
    }

    // GET /sources
    if (method === 'GET' && pathname === '/sources') {
      return await handleGetSources();
    }

    // POST /sources
    if (method === 'POST' && pathname === '/sources') {
      return await handleCreateSource(req);
    }

    // DELETE /sources/:id
    const deleteMatch = matchRoute(pathname, '/sources/:id');
    if (method === 'DELETE' && deleteMatch) {
      return await handleDeleteSource(deleteMatch);
    }

    // POST /collect/all — MUST be before /collect/:sourceId
    if (method === 'POST' && pathname === '/collect/all') {
      return await handleCollectAll();
    }

    // POST /collect/:sourceId
    const collectMatch = matchRoute(pathname, '/collect/:sourceId');
    if (method === 'POST' && collectMatch) {
      return await handleCollectSource(collectMatch);
    }

    // GET /metrics
    if (method === 'GET' && pathname === '/metrics') {
      return await handleGetMetrics(query);
    }

    // GET /status
    if (method === 'GET' && pathname === '/status') {
      return await handleStatus();
    }

    // GET /vendors
    if (method === 'GET' && pathname === '/vendors') {
      return await handleGetVendors();
    }

    // 404
    return json({ ok: false, error: `Not found: ${method} ${pathname}`, timestamp: new Date().toISOString() }, 404);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[oss-collector] Unhandled error:`, e);
    return json({ ok: false, error: `Internal server error: ${msg}`, timestamp: new Date().toISOString() }, 500);
  }
}

// ---- Startup ----

const encKey = process.env.OSS_ENCRYPTION_KEY || 'djezzy-noc-oss-collector-2024-prod-key';
const dbPath = process.env.OSS_DB_PATH || './oss-collector.db';

console.log(`[oss-collector] Initializing database: ${dbPath}`);
initDb(dbPath, encKey);

// Seed default Djezzy sources (async for credential encryption)
seedDefaultSourcesAsync().then(() => {
  console.log('[oss-collector] Default sources ready');
});

// Start the scheduler
startScheduler(encKey);

// Start HTTP server
const server = Bun.serve({
  port: PORT,
  hostname: '0.0.0.0',
  fetch(req: Request) {
    return handleRequest(req);
  },
});

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║          NetOP OSS Collector — Djezzy NOC Platform             ║
╠═══════════════════════════════════════════════════════════════╣
║  Version:     ${VERSION.padEnd(47)}║
║  Port:        ${String(PORT).padEnd(47)}║
║  Database:    ${dbPath.padEnd(47)}║
║  Uptime:      Running${' '.padEnd(40)}║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                  ║
║    GET  /health        — Health check + vendor statuses      ║
║    GET  /sources       — List data sources                   ║
║    POST /sources       — Add data source                     ║
║    DEL  /sources/:id   — Remove data source                  ║
║    POST /collect/:id   — Manual collection for source        ║
║    POST /collect/all   — Collect from all sources             ║
║    GET  /metrics       — Collected metrics (paginated)        ║
║    GET  /status        — Overall collector status             ║
║    GET  /vendors       — Supported vendors + adapter info     ║
╚═══════════════════════════════════════════════════════════════╝
`);
