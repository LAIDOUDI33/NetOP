import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 120 });
  if (limited) return rateLimitResponse(resetMs);

  const { searchParams } = new URL(request.url);
  const technology = searchParams.get('technology') || undefined;
  const region = searchParams.get('region') || undefined;
  const status = searchParams.get('status') || undefined;
  const boundsParam = searchParams.get('bounds') || undefined;

  try {
    // Build where clause
    const where: Record<string, unknown> = {};
    if (technology) where.technology = technology;
    if (region) where.region = region;
    if (status) where.status = status;

    // Parse bounding box: lat1,lng1,lat2,lng2
    let bounds: { latMin: number; latMax: number; lngMin: number; lngMax: number } | null = null;
    if (boundsParam) {
      const parts = boundsParam.split(',').map(Number);
      if (parts.length === 4 && parts.every((p) => !isNaN(p))) {
        bounds = {
          latMin: Math.min(parts[0], parts[2]),
          latMax: Math.max(parts[0], parts[2]),
          lngMin: Math.min(parts[1], parts[3]),
          lngMax: Math.max(parts[1], parts[3]),
        };
      }
    }

    if (bounds) {
      where.latitude = { gte: bounds.latMin, lte: bounds.latMax };
      where.longitude = { gte: bounds.lngMin, lte: bounds.lngMax };
    }

    // Fetch sites with latest KPI metrics, health scores, alert counts, and outage status
    const sites = await db.networkSite.findMany({
      where,
      include: {
        kpiMetrics: {
          orderBy: { timestamp: 'desc' },
          take: 1,
          select: {
            rsrp: true,
            availability: true,
            downloadThroughput: true,
            rsrq: true,
            sinr: true,
            uploadThroughput: true,
            latency: true,
            dropRate: true,
            prbUtilization: true,
            activeUsers: true,
          },
        },
        healthScores: {
          orderBy: { timestamp: 'desc' },
          take: 1,
          select: { overallScore: true, grade: true, trend: true },
        },
        alerts: {
          where: { acknowledged: false },
          select: { id: true },
        },
        outages: {
          where: { status: 'active' },
          select: { id: true },
        },
      },
    });

    // Build response
    const siteData = sites.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      technology: s.technology,
      region: s.region,
      status: s.status,
      latitude: s.latitude,
      longitude: s.longitude,
      metrics: {
        rsrp: s.kpiMetrics[0]?.rsrp ?? null,
        availability: s.kpiMetrics[0]?.availability ?? null,
        throughputDl: s.kpiMetrics[0]?.downloadThroughput ?? null,
        healthScore: s.healthScores[0]?.overallScore ?? null,
      },
      alertCount: s.alerts.length,
      hasOutage: s.outages.length > 0,
    }));

    // Build region clusters (group by region, compute centroid)
    const regionMap = new Map<
      string,
      { count: number; latSum: number; lngSum: number }
    >();
    for (const s of sites) {
      const existing = regionMap.get(s.region);
      if (existing) {
        existing.count += 1;
        existing.latSum += s.latitude;
        existing.lngSum += s.longitude;
      } else {
        regionMap.set(s.region, {
          count: 1,
          latSum: s.latitude,
          lngSum: s.longitude,
        });
      }
    }
    const clusters = Array.from(regionMap.entries()).map(
      ([region, data]) => ({
        region,
        count: data.count,
        lat: Number((data.latSum / data.count).toFixed(4)),
        lng: Number((data.lngSum / data.count).toFixed(4)),
      })
    );

    return NextResponse.json({
      sites: siteData,
      clusters,
      total: siteData.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
