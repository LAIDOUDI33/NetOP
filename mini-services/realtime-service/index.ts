import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import path from "path";

const dbPath = path.resolve(import.meta.dir, "../../db/custom.db");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${dbPath}`,
    },
  },
});

const PORT = 3003;

const io = new Server(PORT, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

console.log(`[NetOptima Realtime] Socket.IO server listening on port ${PORT}`);

// ── KPI Update: every 10 seconds ──────────────────────────────────────────────

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
    console.log(`[KPI Update] Broadcasted aggregated data for ${payload.length} technology group(s)`);
  } catch (error) {
    console.error("[KPI Update] Error:", error);
  }
}

// ── Alert Pulse: every 15 seconds ─────────────────────────────────────────────

async function broadcastAlertPulse() {
  try {
    const criticalCount = await prisma.alert.count({
      where: {
        severity: "critical",
        acknowledged: false,
        resolvedAt: null,
      },
    });

    io.emit("alert-pulse", {
      unresolvedCritical: criticalCount,
      timestamp: new Date().toISOString(),
    });

    console.log(`[Alert Pulse] Unresolved critical alerts: ${criticalCount}`);
  } catch (error) {
    console.error("[Alert Pulse] Error:", error);
  }
}

// ── Per-Site Subscription ─────────────────────────────────────────────────────

const siteSubscriptions = new Map<string, NodeJS.Timeout>();

async function startSiteSubscription(socketId: string, siteId: string) {
  // Clear existing subscription for this socket
  stopSiteSubscription(socketId);

  console.log(`[Site Subscribe] Socket ${socketId} subscribed to site ${siteId}`);

  const sendSiteKpi = async () => {
    try {
      const latestKpi = await prisma.kpiMetric.findFirst({
        where: { siteId },
        orderBy: { timestamp: "desc" },
      });

      if (latestKpi) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit("site-kpi", {
            siteId,
            ...latestKpi,
          });
        } else {
          // Socket disconnected, clean up
          stopSiteSubscription(socketId);
        }
      }
    } catch (error) {
      console.error(`[Site KPI] Error fetching for site ${siteId}:`, error);
    }
  };

  // Send immediately, then every 5 seconds
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

// ── Connection Handling ───────────────────────────────────────────────────────

io.on("connection", (socket) => {
  const socketId = socket.id;
  console.log(`[Connect] Client connected: ${socketId}`);

  // Acknowledge connection
  socket.emit("connected", { message: "Real-time feed active" });

  // Per-site subscription
  socket.on("subscribe-site", (data: { siteId: string }) => {
    if (data?.siteId) {
      startSiteSubscription(socketId, data.siteId);
    }
  });

  // Clean up on disconnect
  socket.on("disconnect", (reason) => {
    console.log(`[Disconnect] Client ${socketId} disconnected: ${reason}`);
    stopSiteSubscription(socketId);
  });
});

// ── Start Broadcast Intervals ─────────────────────────────────────────────────

// KPI update every 10 seconds
setInterval(broadcastKpiUpdate, 10_000);
// Alert pulse every 15 seconds
setInterval(broadcastAlertPulse, 15_000);

// Fire initial broadcasts after a short delay to let the DB settle
setTimeout(broadcastKpiUpdate, 2_000);
setTimeout(broadcastAlertPulse, 3_000);

// ── Graceful Shutdown ─────────────────────────────────────────────────────────

process.on("SIGINT", async () => {
  console.log("\n[Shutdown] Cleaning up...");
  for (const [, interval] of siteSubscriptions) {
    clearInterval(interval);
  }
  siteSubscriptions.clear();
  await prisma.$disconnect();
  io.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n[Shutdown] Cleaning up...");
  for (const [, interval] of siteSubscriptions) {
    clearInterval(interval);
  }
  siteSubscriptions.clear();
  await prisma.$disconnect();
  io.close();
  process.exit(0);
});