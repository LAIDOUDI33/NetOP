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
  const technology = searchParams.get('technology');
  const region = searchParams.get('region');

  try {
    const where: any = {};
    if (technology && technology !== 'all') where.technology = technology;
    if (region && region !== 'all') where.region = region;

    const oneHourAgo = await demoHoursAgo(1);

    const sites = await db.networkSite.findMany({
      where,
      include: {
        kpiMetrics: {
          where: { timestamp: { gte: oneHourAgo } },
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
      take: 1000,
    });

    const siteData = sites.map(s => {
      const kpi = s.kpiMetrics[0];
      return {
        id: s.id,
        name: s.name,
        code: s.code,
        technology: s.technology,
        status: s.status,
        region: s.region,
        latitude: s.latitude,
        longitude: s.longitude,
        frequency: s.frequency,
        bandwidth: s.bandwidth,
        vendor: s.vendor,
        maxCapacity: s.maxCapacity,
        avgSignal: kpi?.rsrp ?? kpi?.rssi ?? kpi?.rxlev ?? 0,
        avgThroughput: kpi?.downloadThroughput ?? 0,
        avgUsers: kpi?.activeUsers ?? 0,
      };
    });

    // Region stats
    const regionNames = [...new Set(sites.map(s => s.region))];
    const regionStats = regionNames.map(r => {
      const rSites = sites.filter(s => s.region === r);
      return {
        region: r,
        totalSites: rSites.length,
        avgAvailability: Number((rSites.reduce((s, r) => s + (r.kpiMetrics[0]?.availability ?? 0), 0) / rSites.length).toFixed(2)),
        avgSignal: Number((rSites.reduce((s, r) => s + (r.kpiMetrics[0]?.rsrp ?? r.kpiMetrics[0]?.rssi ?? r.kpiMetrics[0]?.rxlev ?? 0), 0) / rSites.length).toFixed(2)),
        techDistribution: {
          '2G': rSites.filter(s => s.technology === '2G').length,
          '3G': rSites.filter(s => s.technology === '3G').length,
          '4G': rSites.filter(s => s.technology === '4G').length,
          '5G': rSites.filter(s => s.technology === '5G').length,
        },
      };
    });

    return NextResponse.json({ sites: siteData, regionStats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}