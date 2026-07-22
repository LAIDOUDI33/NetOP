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

async function generateFreshKpiData() {
  try {
    const sites = await prisma.networkSite.findMany({
      select: { id: true, technology: true, status: true },
    });

    if (sites.length === 0) {
      console.log("[DataGen] No sites found, skipping");
      return;
    }

    const created = [];

    for (const site of sites) {
      // Get the latest KPI for this site
      const latest = await prisma.kpiMetric.findFirst({
        where: { siteId: site.id },
        orderBy: { timestamp: "desc" },
      });

      if (!latest) continue;

      // Generate realistic variations
      const base = latest;
      const data: Record<string, any> = {
        siteId: site.id,
        technology: site.technology,
        timestamp: new Date(),
        // Signal metrics: small variation
        rssi: base.rssi != null ? jitter(base.rssi, 0.03) : null,
        rsrp: base.rsrp != null ? jitter(base.rsrp, 0.03) : null,
        rsrq: base.rsrq != null ? jitter(base.rsrq, 0.04) : null,
        sinr: base.sinr != null ? jitter(base.sinr, 0.05) : null,
        rscp: base.rscp != null ? jitter(base.rscp, 0.03) : null,
        ecno: base.ecno != null ? jitter(base.ecno, 0.04) : null,
        rxlev: base.rxlev != null ? jitter(base.rxlev, 0.03) : null,
        cqichannel: base.cqichannel != null ? jitter(base.cqichannel, 0.04) : null,
        // Throughput: moderate variation
        downloadThroughput: base.downloadThroughput != null ? jitter(base.downloadThroughput, 0.08) : null,
        uploadThroughput: base.uploadThroughput != null ? jitter(base.uploadThroughput, 0.08) : null,
        // Latency: small variation
        latency: base.latency != null ? jitter(base.latency, 0.05) : null,
        jitter: base.jitter != null ? jitter(base.jitter, 0.06) : null,
        packetLoss: base.packetLoss != null ? jitter(base.packetLoss, 0.10) : null,
        // Availability: very small variation, keep high
        availability: base.availability != null ? jitter(base.availability, 0.005) : null,
        // Active users: larger variation (±15%)
        activeUsers: base.activeUsers != null ? jitterInt(base.activeUsers, 0.15) : null,
        // KPIs: small variation
        handoverSuccessRate: base.handoverSuccessRate != null ? jitter(base.handoverSuccessRate, 0.01) : null,
        dropRate: base.dropRate != null ? Math.max(0, jitter(base.dropRate, 0.15)) : null,
        blockedCallRate: base.blockedCallRate != null ? Math.max(0, jitter(base.blockedCallRate, 0.15)) : null,
        prbUtilization: base.prbUtilization != null ? jitter(base.prbUtilization, 0.06) : null,
      };

      const record = await prisma.kpiMetric.create({ data });
      created.push(record);

      // Occasionally generate alerts on threshold breach (5% chance per site)
      if (Math.random() < 0.05) {
        const metrics = [
          { field: "rsrp" as const, threshold: -110, condition: "<" as const, severity: "warning" as const },
          { field: "sinr" as const, threshold: -3, condition: "<" as const, severity: "critical" as const },
          { field: "availability" as const, threshold: 95, condition: "<" as const, severity: "critical" as const },
          { field: "dropRate" as const, threshold: 2, condition: ">" as const, severity: "warning" as const },
          { field: "latency" as const, threshold: 50, condition: ">" as const, severity: "warning" as const },
        ];

        const m = metrics[Math.floor(Math.random() * metrics.length)];
        const val = data[m.field];
        if (val != null) {
          const breached = m.condition === "<" ? val < m.threshold : val > m.threshold;
          if (breached) {
            await prisma.alert.create({
              data: {
                siteId: site.id,
                technology: site.technology,
                metric: m.field,
                value: val,
                threshold: m.threshold,
                condition: m.condition,
                severity: m.severity,
                message: `${site.technology} ${m.field} ${m.condition} ${m.threshold}: current ${val.toFixed(1)}`,
              },
            });
          }
        }
      }
    }

    console.log(`[DataGen] Generated ${created.length} fresh KPI records at ${new Date().toISOString()}`);
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
