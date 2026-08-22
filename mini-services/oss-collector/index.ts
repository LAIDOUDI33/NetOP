// ══════════════════════════════════════════════════════════════════════════════
// NetOP OSS Collector — Main Entry Point
// ══════════════════════════════════════════════════════════════════════════════
// HTTP server on port 3005 + cron scheduler for automatic collection.
//
// Endpoints:
//   GET  /health          — service health
//   GET  /status          — full orchestrator status
//   GET  /vendors         — configured vendors
//   GET  /schedules       — active collection schedules
//   POST /schedules/:vendor — update schedule cron
//   POST /collect/:vendor  — trigger manual collection
//   POST /collect/all      — trigger collection for all vendors
//   GET  /metrics          — Prometheus-compatible metrics
// ══════════════════════════════════════════════════════════════════════════════

import { CollectorOrchestrator } from './src/collector';
import { buildCollectorConfigs, SERVICE_PORT, logger, IS_DEMO_MODE, getSupportedVendors, VENDOR_CONFIGS } from './src/config';
import type { VendorType } from './src/types';

// ─────────────────────────────────────────────────────────────────────────────
// ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

const orchestrator = new CollectorOrchestrator();
let server: ReturnType<typeof Bun.serve> | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// HTTP HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    // ── Health Check ───────────────────────────────────────────────
    if (path === '/health' && method === 'GET') {
      return jsonResponse({
        service: 'netop-oss-collector',
        version: '1.0.0',
        status: 'healthy',
        demoMode: IS_DEMO_MODE,
        uptime: orchestrator.getStatus().uptime,
        collectors: orchestrator.getVendors().length,
        activeSchedules: orchestrator.getScheduler().getSchedules().filter(s => s.enabled).length,
      });
    }

    // ── Full Status ────────────────────────────────────────────────
    if (path === '/status' && method === 'GET') {
      return jsonResponse(orchestrator.getStatus());
    }

    // ── Vendors ────────────────────────────────────────────────────
    if (path === '/vendors' && method === 'GET') {
      const vendors = orchestrator.getVendors().map(v => ({
        vendor: v,
        name: VENDOR_CONFIGS[v].name,
        technologies: VENDOR_CONFIGS[v].supportedTech,
        health: orchestrator.getStatus().collectors.find(c => c.vendor === v),
      }));
      return jsonResponse(vendors);
    }

    // ── Schedules ──────────────────────────────────────────────────
    if (path === '/schedules' && method === 'GET') {
      return jsonResponse(orchestrator.getScheduler().getSchedules());
    }

    // ── Update Schedule ────────────────────────────────────────────
    const scheduleMatch = path.match(/^\/schedules\/([a-z]+)$/);
    if (scheduleMatch && method === 'POST') {
      const vendor = scheduleMatch[1] as VendorType;
      const body = await req.json().catch(() => ({}));
      const { cron, enabled } = body as { cron?: string; enabled?: boolean };

      if (!cron && enabled === undefined) {
        return jsonResponse({ error: 'Provide cron or enabled field' }, 400);
      }

      const scheduler = orchestrator.getScheduler();
      if (cron) {
        // Update all schedules for this vendor
        const schedules = scheduler.getSchedules().filter(s => s.vendor === vendor);
        for (const s of schedules) {
          scheduler.updateSchedule(`${s.vendor}:${s.technology}`, cron);
        }
      }
      if (enabled !== undefined) {
        const schedules = scheduler.getSchedules().filter(s => s.vendor === vendor);
        for (const s of schedules) {
          scheduler.toggleSchedule(`${s.vendor}:${s.technology}`, enabled);
        }
      }

      return jsonResponse({ success: true, schedules: scheduler.getSchedules().filter(s => s.vendor === vendor) });
    }

    // ── Collect Single Vendor ─────────────────────────────────────
    const collectMatch = path.match(/^\/collect\/([a-z]+)$/);
    if (collectMatch && method === 'POST') {
      const vendor = collectMatch[1] as VendorType;
      if (!getSupportedVendors().includes(vendor)) {
        return jsonResponse({ error: `Unknown vendor: ${vendor}` }, 400);
      }
      if (orchestrator.getScheduler().isAtCapacity()) {
        return jsonResponse({ error: 'At max concurrent collections', retryAfter: 30 }, 429);
      }

      // Run in background, return immediately
      orchestrator.collectVendor(vendor).then(result => {
        logger.info(`Manual collection complete for ${vendor}: ${result.kpisCollected} KPIs, ${result.faultsCollected} faults`);
      });

      return jsonResponse({ accepted: true, vendor, message: 'Collection started' }, 202);
    }

    // ── Collect All ───────────────────────────────────────────────
    if (path === '/collect/all' && method === 'POST') {
      orchestrator.collectAll().then(results => {
        for (const [v, r] of results) {
          logger.info(`[All] ${v}: ${r.kpisCollected} KPIs, ${r.faultsCollected} faults, ${r.success ? 'OK' : 'ERRORS'}`);
        }
      });
      return jsonResponse({ accepted: true, message: 'Collection started for all vendors' }, 202);
    }

    // ── Prometheus Metrics ─────────────────────────────────────────
    if (path === '/metrics' && method === 'GET') {
      return new Response(orchestrator.getPrometheusMetrics(), {
        headers: { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' },
      });
    }

    // ── 404 ────────────────────────────────────────────────────────
    return jsonResponse({ error: 'Not found', availableEndpoints: ['/health', '/status', '/vendors', '/schedules', '/collect/:vendor', '/collect/all', '/metrics'] }, 404);

  } catch (err) {
    logger.error(`Request error: ${err}`);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STARTUP
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
 logger.info('═══════════════════════════════════════════════════════════');
  logger.info('  NetOP OSS Collector v1.0.0');
  logger.info(`  Mode: ${IS_DEMO_MODE ? 'DEMO (simulated data)' : 'PRODUCTION (real OSS)'}`);
  logger.info('═══════════════════════════════════════════════════════════');

  // 1. Build configs from environment
  const configs = buildCollectorConfigs();
  logger.info(`Found ${configs.length} vendor configurations`);

  // 2. Initialize orchestrator
  await orchestrator.initialize(configs);

  // 3. Start HTTP server
  server = Bun.serve({
    port: SERVICE_PORT,
    hostname: '0.0.0.0',
    fetch: handleRequest,
  });
  logger.info(`HTTP server listening on port ${SERVICE_PORT}`);

  // 4. Start scheduled collections
  orchestrator.start();
  logger.info('Scheduled collections started');

  logger.info(`Ready — endpoints: http://localhost:${SERVICE_PORT}/health`);
}

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('SIGINT received — shutting down...');
  orchestrator.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down...');
  orchestrator.stop();
  process.exit(0);
});

main().catch(err => {
  logger.error(`Fatal startup error: ${err}`);
  process.exit(1);
});
