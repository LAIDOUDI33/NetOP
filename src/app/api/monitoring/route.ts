import { db } from '@/lib/db';
import { demoHoursAgo } from '@/lib/demo-time';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);
  const { searchParams } = new URL(request.url);
  const technology = searchParams.get('technology') || '4G';
  const oneHourAgo = await demoHoursAgo(1);
  const sixHoursAgo = await demoHoursAgo(6);

  try {
    // Sites with their latest KPI
    const sites = await db.networkSite.findMany({
      where: { technology },
      include: {
        kpiMetrics: {
          where: { timestamp: { gte: oneHourAgo } },
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
      take: 1000,
    });

    const siteSummaries = sites.map(site => {
      const kpi = site.kpiMetrics[0];
      const latestKpi: Record<string, number> = {};
      if (kpi) {
        for (const key of Object.keys(kpi) as (keyof typeof kpi)[]) {
          if (typeof kpi[key] === 'number') {
            latestKpi[key] = kpi[key] as number;
          }
        }
      }
      return {
        siteId: site.id,
        siteName: site.name,
        code: site.code,
        technology: site.technology as any,
        status: site.status as any,
        region: site.region,
        frequency: site.frequency,
        vendor: site.vendor,
        maxCapacity: site.maxCapacity,
        avgRsrp: kpi?.rsrp,
        avgRssi: kpi?.rssi,
        avgSinr: kpi?.sinr,
        avgDownloadThroughput: kpi?.downloadThroughput || 0,
        avgUploadThroughput: kpi?.uploadThroughput || 0,
        avgLatency: kpi?.latency || 0,
        avgAvailability: kpi?.availability || 0,
        avgActiveUsers: kpi?.activeUsers || 0,
        avgHandoverSuccessRate: kpi?.handoverSuccessRate || 0,
        avgDropRate: kpi?.dropRate || 0,
        avgPrbUtilization: kpi?.prbUtilization,
        latestKpi,
      };
    });

    // Trend data (6 hours)
    const trendKpis = await db.kpiMetric.findMany({
      where: { technology, timestamp: { gte: sixHoursAgo } },
      orderBy: { timestamp: 'asc' },
      take: 500,
    });

    const buckets: Record<string, { rsrp: number[]; sinr: number[]; dl: number[]; ul: number[]; lat: number[]; users: number[]; avail: number[] }> = {};
    for (const kpi of trendKpis) {
      const h = new Date(kpi.timestamp);
      const key = `${h.getHours()}:00`;
      if (!buckets[key]) buckets[key] = { rsrp: [], sinr: [], dl: [], ul: [], lat: [], users: [], avail: [] };
      buckets[key].rsrp.push(kpi.rsrp || kpi.rssi || 0);
      buckets[key].sinr.push(kpi.sinr || 0);
      buckets[key].dl.push(kpi.downloadThroughput || 0);
      buckets[key].ul.push(kpi.uploadThroughput || 0);
      buckets[key].lat.push(kpi.latency || 0);
      buckets[key].users.push(kpi.activeUsers || 0);
      buckets[key].avail.push(kpi.availability || 0);
    }

    const timestamps = Object.keys(buckets);
    const avg = (arr: number[]) => { if (!arr.length) return 0; return Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)); };

    const summary = {
      totalSites: sites.length,
      activeSites: sites.filter(s => s.status === 'active').length,
      avgRsrp: avg(Object.values(buckets).flatMap(b => b.rsrp)),
      avgRssi: avg(Object.values(buckets).flatMap(b => b.rsrp)), // RSSI mapped from RSRP for 2G/3G compatibility
      avgSinr: avg(Object.values(buckets).flatMap(b => b.sinr)),
      avgDownload: avg(Object.values(buckets).flatMap(b => b.dl)),
      avgUpload: avg(Object.values(buckets).flatMap(b => b.ul)),
      avgLatency: avg(Object.values(buckets).flatMap(b => b.lat)),
      avgAvailability: avg(Object.values(buckets).flatMap(b => b.avail)),
      totalUsers: Math.round(avg(Object.values(buckets).flatMap(b => b.users))),
    };

    return NextResponse.json({
      sites: siteSummaries,
      trend: {
        timestamps,
        metrics: {
          rsrp: timestamps.map(t => avg(buckets[t].rsrp)),
          sinr: timestamps.map(t => avg(buckets[t].sinr)),
          download: timestamps.map(t => avg(buckets[t].dl)),
          upload: timestamps.map(t => avg(buckets[t].ul)),
          latency: timestamps.map(t => avg(buckets[t].lat)),
          users: timestamps.map(t => Math.round(avg(buckets[t].users))),
          availability: timestamps.map(t => avg(buckets[t].avail)),
        },
      },
      summary,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}