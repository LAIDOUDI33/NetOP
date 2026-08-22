import { db } from '@/lib/db';
import { demoHoursAgo } from '@/lib/demo-time';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError } from '@/lib/api-auth';
import { dashboardCache, cachedQuery } from '@/lib/cache-helper';

export async function GET(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);
  try {
    return NextResponse.json(
      await cachedQuery(dashboardCache, 'dashboard:overview', 15_000, async () => {
        return await buildDashboardData();
      })
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function buildDashboardData() {
    const oneHourAgo = await demoHoursAgo(1);
    const oneDayAgo = await demoHoursAgo(24);

    // Site counts by technology and status
    const allSites = await db.networkSite.findMany({ take: 1000 });
    const sitesByTech: Record<string, number> = { '2G': 0, '3G': 0, '4G': 0, '5G': 0 };
    const sitesByStatus: Record<string, number> = { active: 0, degraded: 0, down: 0, maintenance: 0 };

    for (const site of allSites) {
      sitesByTech[site.technology] = (sitesByTech[site.technology] || 0) + 1;
      sitesByStatus[site.status] = (sitesByStatus[site.status] || 0) + 1;
    }

    // Latest KPI metrics (last hour)
    const latestKpis = await db.kpiMetric.groupBy({
      by: ['siteId', 'technology'],
      where: { timestamp: { gte: oneHourAgo } },
      _avg: {
        downloadThroughput: true,
        uploadThroughput: true,
        latency: true,
        availability: true,
        activeUsers: true,
        handoverSuccessRate: true,
        dropRate: true,
        prbUtilization: true,
        rsrp: true,
        rssi: true,
        sinr: true,
      },
    });

    const totalActiveUsers = Math.round(latestKpis.reduce((sum, k) => sum + (k._avg.activeUsers || 0), 0) / Math.max(latestKpis.length, 1));
    const avgThroughput = {
      download: Number((latestKpis.reduce((s, k) => s + (k._avg.downloadThroughput || 0), 0) / Math.max(latestKpis.length, 1)).toFixed(2)),
      upload: Number((latestKpis.reduce((s, k) => s + (k._avg.uploadThroughput || 0), 0) / Math.max(latestKpis.length, 1)).toFixed(2)),
    };
    const avgLatency = Number((latestKpis.reduce((s, k) => s + (k._avg.latency || 0), 0) / Math.max(latestKpis.length, 1)).toFixed(1));
    const avgAvailability = Number((latestKpis.reduce((s, k) => s + (k._avg.availability || 0), 0) / Math.max(latestKpis.length, 1)).toFixed(2));

    // Alerts
    const activeAlerts = await db.alert.count({ where: { resolvedAt: null } });
    const recentAlerts = await db.alert.count({ where: { createdAt: { gte: oneDayAgo } } });

    // KPI Trends (last 6 hours, hourly)
    const sixHoursAgo = await demoHoursAgo(6);
    const trendKpis = await db.kpiMetric.groupBy({
      by: ['timestamp'],
      where: { timestamp: { gte: sixHoursAgo } },
      _avg: {
        downloadThroughput: true,
        uploadThroughput: true,
        latency: true,
        activeUsers: true,
      },
      orderBy: { timestamp: 'asc' },
    });

    const timestamps: string[] = [];
    const download: number[] = [];
    const upload: number[] = [];
    const latency: number[] = [];
    const users: number[] = [];

    // Bucket into ~hourly
    const buckets: Record<string, { d: number[]; u: number[]; l: number[]; users: number[] }> = {};
    for (const kpi of trendKpis) {
      const h = new Date(kpi.timestamp);
      const key = `${h.getHours()}:00`;
      if (!buckets[key]) buckets[key] = { d: [], u: [], l: [], users: [] };
      buckets[key].d.push(kpi._avg.downloadThroughput || 0);
      buckets[key].u.push(kpi._avg.uploadThroughput || 0);
      buckets[key].l.push(kpi._avg.latency || 0);
      buckets[key].users.push(kpi._avg.activeUsers || 0);
    }

    for (const [key, vals] of Object.entries(buckets)) {
      timestamps.push(key);
      download.push(Number((vals.d.reduce((a, b) => a + b, 0) / vals.d.length).toFixed(2)));
      upload.push(Number((vals.u.reduce((a, b) => a + b, 0) / vals.u.length).toFixed(2)));
      latency.push(Number((vals.l.reduce((a, b) => a + b, 0) / vals.l.length).toFixed(1)));
      users.push(Math.round(vals.users.reduce((a, b) => a + b, 0) / vals.users.length));
    }

    // Technology health
    const techHealthPromises = (['2G', '3G', '4G', '5G'] as const).map(async (tech) => {
      const techSites = allSites.filter(s => s.technology === tech);
      const techKpis = latestKpis.filter(k => k.technology === tech);
      const avg = (field: string) => {
        if (!techKpis.length) return 0;
        const sum = techKpis.reduce((s, k) => s + (k._avg as any)[field] || 0, 0);
        return Number((sum / techKpis.length).toFixed(2));
      };
      return {
        technology: tech,
        availability: avg('availability'),
        throughput: avg('downloadThroughput'),
        latency: avg('latency'),
        users: Math.round(avg('activeUsers')),
        sites: techSites.length,
        activeSites: techSites.filter(s => s.status === 'active').length,
      };
    });
    const techHealth = await Promise.all(techHealthPromises);

    return {
      totalSites: allSites.length,
      sitesByTech,
      sitesByStatus,
      totalActiveUsers,
      avgThroughput,
      avgLatency,
      avgAvailability,
      activeAlerts,
      recentAlerts,
      kpiTrends: { timestamps, download, upload, latency, users },
      techHealth,
    };
}