import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import path from "path";

const dbPath = path.resolve(import.meta.dir, "../../db/custom.db");

const prisma = new PrismaClient({
  datasources: { db: { url: `file:${dbPath}` } },
});

const PORT = 3003;

const io = new Server(PORT, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

console.log(`[NetOptima Algérie Realtime] Socket.IO + Data Gen service on port ${PORT}`);

// ── Helpers ────────────────────────────────────────────────────────────────────

function jitter(value: number, pct: number): number {
  const delta = value * pct * (Math.random() * 2 - 1);
  return Math.round((value + delta) * 100) / 100;
}

function jitterInt(value: number, pct: number): number {
  const delta = value * pct * (Math.random() * 2 - 1);
  return Math.round(value + delta);
}

// Site name cache for real-time alerts
let siteNameCache = new Map<string, { name: string; code: string }>();

async function loadSiteNames() {
  try {
    const sites = await prisma.networkSite.findMany({
      select: { id: true, name: true, code: true },
      take: 500,
    });
    siteNameCache = new Map(sites.map(s => [s.id, { name: s.name, code: s.code }]));
    console.log(`[Cache] Loaded ${siteNameCache.size} site names`);
  } catch (e) {
    console.error("[Cache] Failed to load site names:", e);
  }
}

function getSiteInfo(siteId: string): { name: string; code: string } {
  return siteNameCache.get(siteId) ?? { name: 'Unknown', code: '' };
}

// ── 1. Continuous Data Generation (every 30 seconds) ─────────────────────────

async function generateFreshKpiData() {
  try {
    const sites = await prisma.networkSite.findMany({
      select: { id: true, technology: true, status: true },
      take: 200,
    });

    if (sites.length === 0) {
      console.log("[DataGen] No sites found, skipping");
      return;
    }

    const siteIds = sites.map(s => s.id);

    const placeholders = siteIds.map(() => '?').join(',');
    const latestKpis = await prisma.$queryRawUnsafe(
      `SELECT k.* FROM KpiMetric k
       INNER JOIN (
         SELECT siteId, MAX(timestamp) as maxTs
         FROM KpiMetric
         WHERE siteId IN (${placeholders})
         GROUP BY siteId
       ) latest ON k.siteId = latest.siteId AND k.timestamp = latest.maxTs`,
      ...siteIds
    ) as Array<Record<string, unknown>>;

    const kpiMap = new Map(latestKpis.map(k => [k.siteId as string, k]));

    const now = new Date();
    const kpiRecords: Array<Record<string, unknown>> = [];
    const alertRecords: Array<Record<string, unknown>> = [];
    const liveAlerts: Array<{
      id: string;
      siteName: string;
      siteCode: string;
      technology: string;
      metric: string;
      value: number;
      threshold: number;
      severity: string;
      message: string;
      createdAt: string;
    }> = [];

    const alertMetricOptions = [
      { field: "rsrp", threshold: -110, condition: "<", severity: "warning" },
      { field: "sinr", threshold: -3, condition: "<", severity: "critical" },
      { field: "availability", threshold: 95, condition: "<", severity: "critical" },
      { field: "dropRate", threshold: 2, condition: ">", severity: "warning" },
      { field: "latency", threshold: 50, condition: ">", severity: "warning" },
      { field: "prbUtilization", threshold: 85, condition: ">", severity: "warning" },
      { field: "handoverSuccessRate", threshold: 95, condition: "<", severity: "critical" },
    ];

    for (const site of sites) {
      const base = kpiMap.get(site.id);
      if (!base) continue;

      const data: Record<string, unknown> = {
        siteId: site.id,
        technology: site.technology,
        timestamp: now,
        rssi: base.rssi != null ? jitter(base.rssi as number, 0.03) : null,
        rsrp: base.rsrp != null ? jitter(base.rsrp as number, 0.03) : null,
        rsrq: base.rsrq != null ? jitter(base.rsrq as number, 0.04) : null,
        sinr: base.sinr != null ? jitter(base.sinr as number, 0.05) : null,
        rscp: base.rscp != null ? jitter(base.rscp as number, 0.03) : null,
        ecno: base.ecno != null ? jitter(base.ecno as number, 0.04) : null,
        rxlev: base.rxlev != null ? jitter(base.rxlev as number, 0.03) : null,
        cqichannel: base.cqichannel != null ? jitter(base.cqichannel as number, 0.04) : null,
        downloadThroughput: base.downloadThroughput != null ? jitter(base.downloadThroughput as number, 0.08) : null,
        uploadThroughput: base.uploadThroughput != null ? jitter(base.uploadThroughput as number, 0.08) : null,
        latency: base.latency != null ? jitter(base.latency as number, 0.05) : null,
        jitter: base.jitter != null ? jitter(base.jitter as number, 0.06) : null,
        packetLoss: base.packetLoss != null ? jitter(base.packetLoss as number, 0.10) : null,
        availability: base.availability != null ? jitter(base.availability as number, 0.005) : null,
        activeUsers: base.activeUsers != null ? jitterInt(base.activeUsers as number, 0.15) : null,
        handoverSuccessRate: base.handoverSuccessRate != null ? jitter(base.handoverSuccessRate as number, 0.01) : null,
        dropRate: base.dropRate != null ? Math.max(0, jitter(base.dropRate as number, 0.15)) : null,
        blockedCallRate: base.blockedCallRate != null ? Math.max(0, jitter(base.blockedCallRate as number, 0.15)) : null,
        prbUtilization: base.prbUtilization != null ? jitter(base.prbUtilization as number, 0.06) : null,
      };

      kpiRecords.push(data);

      // 8% chance to generate alert (increased for more live activity)
      if (Math.random() < 0.08) {
        const m = alertMetricOptions[Math.floor(Math.random() * alertMetricOptions.length)];
        const val = data[m.field];
        if (val != null) {
          const breached = m.condition === "<" ? (val as number) < m.threshold : (val as number) > m.threshold;
          if (breached) {
            const siteInfo = getSiteInfo(site.id);
            const alertMsg = `${site.technology} ${m.field} ${m.condition} ${m.threshold}: current ${(val as number).toFixed(1)}`;
            const alertId = `rt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            alertRecords.push({
              id: alertId,
              siteId: site.id,
              technology: site.technology,
              metric: m.field,
              value: val,
              threshold: m.threshold,
              condition: m.condition,
              severity: m.severity,
              message: alertMsg,
              createdAt: now,
            });
            // Also push to live alerts array for WebSocket emission
            liveAlerts.push({
              id: alertId,
              siteName: siteInfo.name,
              siteCode: siteInfo.code,
              technology: site.technology,
              metric: m.field,
              value: val as number,
              threshold: m.threshold,
              severity: m.severity,
              message: alertMsg,
              createdAt: now.toISOString(),
            });
          }
        }
      }
    }

    // Batch insert all KPI records (chunked for SQLite limits)
    const CHUNK = 50;
    for (let i = 0; i < kpiRecords.length; i += CHUNK) {
      await prisma.kpiMetric.createMany({ data: kpiRecords.slice(i, i + CHUNK) });
    }

    // Batch insert alerts
    if (alertRecords.length > 0) {
      await prisma.alert.createMany({ data: alertRecords });
    }

    // ── NEW: Emit live alerts to all connected clients ──
    if (liveAlerts.length > 0) {
      io.emit("live-alerts", liveAlerts);
      console.log(`[DataGen] Emitted ${liveAlerts.length} live alerts via WebSocket`);
    }

    console.log(`[DataGen] Generated ${kpiRecords.length} KPI records, ${alertRecords.length} alerts at ${now.toISOString()}`);
  } catch (error) {
    console.error("[DataGen] Error:", error);
  }
}

// ── 2. KPI Aggregation Broadcast (every 10 seconds) ───────────────────────────

async function broadcastKpiUpdate() {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const results = await prisma.$queryRawUnsafe(
      `SELECT
        technology,
        AVG(downloadThroughput) AS avg_downloadThroughput,
        AVG(uploadThroughput)   AS avg_uploadThroughput,
        AVG(latency)            AS avg_latency,
        AVG(availability)       AS avg_availability,
        AVG(activeUsers)        AS avg_activeUsers,
        AVG(sinr)               AS avg_sinr,
        AVG(prbUtilization)     AS avg_prbUtilization,
        COUNT(*)                AS sites
      FROM KpiMetric
      WHERE timestamp >= ?
      GROUP BY technology`,
      oneHourAgo
    ) as Array<Record<string, unknown>>;

    const payload = results.map((row) => ({
      technology: row.technology as string,
      downloadThroughput: Number(row.avg_downloadThroughput ?? 0),
      uploadThroughput: Number(row.avg_uploadThroughput ?? 0),
      latency: Number(row.avg_latency ?? 0),
      availability: Number(row.avg_availability ?? 0),
      activeUsers: Number(row.avg_activeUsers ?? 0),
      sinr: Number(row.avg_sinr ?? 0),
      prbUtilization: Number(row.avg_prbUtilization ?? 0),
      sites: Number(row.sites),
    }));

    io.emit("kpi-update", payload);
  } catch (error) {
    console.error("[KPI Update] Error:", error);
  }
}

// ── 3. Alert Pulse Broadcast (every 15 seconds) ──────────────────────────────

async function broadcastAlertPulse() {
  try {
    const criticalCount = await prisma.alert.count({
      where: { severity: "critical", acknowledged: false, resolvedAt: null },
    });
    const warningCount = await prisma.alert.count({
      where: { severity: "warning", acknowledged: false, resolvedAt: null },
    });

    io.emit("alert-pulse", {
      unresolvedCritical: criticalCount,
      unresolvedWarning: warningCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Alert Pulse] Error:", error);
  }
}

// ── 4. Per-Site Subscription ───────────────────────────────────────────────────

const siteSubscriptions = new Map<string, NodeJS.Timeout>();

async function startSiteSubscription(socketId: string, siteId: string) {
  stopSiteSubscription(socketId);

  const sendSiteKpi = async () => {
    try {
      const latestKpi = await prisma.kpiMetric.findFirst({
        where: { siteId },
        orderBy: { timestamp: "desc" },
      });

      if (latestKpi) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit("site-kpi", { siteId, ...latestKpi });
        } else {
          stopSiteSubscription(socketId);
        }
      }
    } catch (error) {
      console.error(`[Site KPI] Error for site ${siteId}:`, error);
    }
  };

  await sendSiteKpi();
  const interval = setInterval(sendSiteKpi, 5000);
  siteSubscriptions.set(socketId, interval);
}

function stopSiteSubscription(socketId: string) {
  const existing = siteSubscriptions.get(socketId);
  if (existing) {
    clearInterval(existing);
    siteSubscriptions.delete(socketId);
  }
}

// ── 5. Connection Handling ────────────────────────────────────────────────────

io.on("connection", (socket) => {
  const socketId = socket.id;
  console.log(`[Connect] Client ${socketId}`);

  socket.emit("connected", { message: "NetOptima Algérie real-time feed active", timestamp: new Date().toISOString() });

  socket.on("subscribe-site", (data: { siteId: string }) => {
    if (data?.siteId) startSiteSubscription(socketId, data.siteId);
  });

  socket.on("disconnect", (reason) => {
    console.log(`[Disconnect] Client ${socketId}: ${reason}`);
    stopSiteSubscription(socketId);
  });
});

// ── 6. Start All Intervals ─────────────────────────────────────────────────────

// Load site names first, then start everything
loadSiteNames().then(() => {
  // Data generation: every 30 seconds
  setInterval(generateFreshKpiData, 30_000);
  // KPI broadcast: every 10 seconds
  setInterval(broadcastKpiUpdate, 10_000);
  // Alert pulse: every 15 seconds
  setInterval(broadcastAlertPulse, 15_000);

  // Initial runs after short delay
  setTimeout(generateFreshKpiData, 2_000);
  setTimeout(broadcastKpiUpdate, 3_000);
  setTimeout(broadcastAlertPulse, 4_000);
});

// ── 7. Graceful Shutdown ───────────────────────────────────────────────────────

const shutdown = async (signal: string) => {
  console.log(`\n[Shutdown] ${signal} — Cleaning up...`);
  for (const [, interval] of siteSubscriptions) clearInterval(interval);
  siteSubscriptions.clear();
  await prisma.$disconnect();
  io.close();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
