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

// ── 1. Continuous Data Generation (every 30 seconds) ─────────────────────────
// Optimized: Batch queries instead of N+1 per site

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

    // Batch: get latest KPI per site in a single query
    const latestKpis = await prisma.$queryRaw<Array<{ siteId: string; rssi: number | null; rsrp: number | null; rsrq: number | null; sinr: number | null; rscp: number | null; ecno: number | null; rxlev: number | null; cqichannel: number | null; downloadThroughput: number | null; uploadThroughput: number | null; latency: number | null; jitter: number | null; packetLoss: number | null; availability: number | null; activeUsers: number | null; handoverSuccessRate: number | null; dropRate: number | null; blockedCallRate: number | null; prbUtilization: number | null }>>`
      SELECT k.* FROM KpiMetric k
      INNER JOIN (
        SELECT siteId, MAX(timestamp) as maxTs
        FROM KpiMetric
        WHERE siteId IN (${siteIds.map(() => '?').join(',')})
        GROUP BY siteId
      ) latest ON k.siteId = latest.siteId AND k.timestamp = latest.maxTs
    `;

    // Build lookup map
    const kpiMap = new Map(latestKpis.map(k => [k.siteId, k]));

    const now = new Date();
    const kpiRecords: Array<Record<string, unknown>> = [];
    const alertRecords: Array<Record<string, unknown>> = [];

    const alertMetricOptions = [
      { field: "rsrp" as const, threshold: -110, condition: "<" as const, severity: "warning" as const },
      { field: "sinr" as const, threshold: -3, condition: "<" as const, severity: "critical" as const },
      { field: "availability" as const, threshold: 95, condition: "<" as const, severity: "critical" as const },
      { field: "dropRate" as const, threshold: 2, condition: ">" as const, severity: "warning" as const },
      { field: "latency" as const, threshold: 50, condition: ">" as const, severity: "warning" as const },
    ];

    for (const site of sites) {
      const base = kpiMap.get(site.id);
      if (!base) continue;

      const data: Record<string, unknown> = {
        siteId: site.id,
        technology: site.technology,
        timestamp: now,
        rssi: base.rssi != null ? jitter(base.rssi, 0.03) : null,
        rsrp: base.rsrp != null ? jitter(base.rsrp, 0.03) : null,
        rsrq: base.rsrq != null ? jitter(base.rsrq, 0.04) : null,
        sinr: base.sinr != null ? jitter(base.sinr, 0.05) : null,
        rscp: base.rscp != null ? jitter(base.rscp, 0.03) : null,
        ecno: base.ecno != null ? jitter(base.ecno, 0.04) : null,
        rxlev: base.rxlev != null ? jitter(base.rxlev, 0.03) : null,
        cqichannel: base.cqichannel != null ? jitter(base.cqichannel, 0.04) : null,
        downloadThroughput: base.downloadThroughput != null ? jitter(base.downloadThroughput, 0.08) : null,
        uploadThroughput: base.uploadThroughput != null ? jitter(base.uploadThroughput, 0.08) : null,
        latency: base.latency != null ? jitter(base.latency, 0.05) : null,
        jitter: base.jitter != null ? jitter(base.jitter, 0.06) : null,
        packetLoss: base.packetLoss != null ? jitter(base.packetLoss, 0.10) : null,
        availability: base.availability != null ? jitter(base.availability, 0.005) : null,
        activeUsers: base.activeUsers != null ? jitterInt(base.activeUsers, 0.15) : null,
        handoverSuccessRate: base.handoverSuccessRate != null ? jitter(base.handoverSuccessRate, 0.01) : null,
        dropRate: base.dropRate != null ? Math.max(0, jitter(base.dropRate, 0.15)) : null,
        blockedCallRate: base.blockedCallRate != null ? Math.max(0, jitter(base.blockedCallRate, 0.15)) : null,
        prbUtilization: base.prbUtilization != null ? jitter(base.prbUtilization, 0.06) : null,
      };

      kpiRecords.push(data);

      // 5% chance to generate alert
      if (Math.random() < 0.05) {
        const m = alertMetricOptions[Math.floor(Math.random() * alertMetricOptions.length)];
        const val = data[m.field];
        if (val != null) {
          const breached = m.condition === "<" ? (val as number) < m.threshold : (val as number) > m.threshold;
          if (breached) {
            alertRecords.push({
              siteId: site.id,
              technology: site.technology,
              metric: m.field,
              value: val,
              threshold: m.threshold,
              condition: m.condition,
              severity: m.severity,
              message: `${site.technology} ${m.field} ${m.condition} ${m.threshold}: current ${(val as number).toFixed(1)}`,
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

    console.log(`[DataGen] Generated ${kpiRecords.length} KPI records, ${alertRecords.length} alerts at ${now.toISOString()}`);
  } catch (error) {
    console.error("[DataGen] Error:", error);
  }
}

// ── 2. KPI Aggregation Broadcast (every 10 seconds) ───────────────────────────

async function broadcastKpiUpdate() {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const results: Array<{
      technology: string;
      avg_downloadThroughput: number | null;
      avg_uploadThroughput: number | null;
      avg_latency: number | null;
      avg_availability: number | null;
      avg_activeUsers: number | null;
      avg_sinr: number | null;
      sites: bigint;
    }> = await prisma.$queryRaw`
      SELECT
        technology,
        AVG(downloadThroughput) AS avg_downloadThroughput,
        AVG(uploadThroughput)   AS avg_uploadThroughput,
        AVG(latency)            AS avg_latency,
        AVG(availability)       AS avg_availability,
        AVG(activeUsers)        AS avg_activeUsers,
        AVG(sinr)               AS avg_sinr,
        COUNT(*)                AS sites
      FROM KpiMetric
      WHERE timestamp >= ${oneHourAgo}
      GROUP BY technology
    `;

    const payload = results.map((row) => ({
      technology: row.technology,
      downloadThroughput: row.avg_downloadThroughput ?? 0,
      uploadThroughput: row.avg_uploadThroughput ?? 0,
      latency: row.avg_latency ?? 0,
      availability: row.avg_availability ?? 0,
      activeUsers: Number(row.avg_activeUsers ?? 0),
      sinr: row.avg_sinr ?? 0,
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
