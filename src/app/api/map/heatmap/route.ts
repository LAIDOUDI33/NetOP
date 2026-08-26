import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError } from '@/lib/api-auth';

// Mapping of API metric names to Prisma KpiMetric field names
const METRIC_FIELD_MAP: Record<string, string> = {
  rsrp: 'rsrp',
  rsrq: 'rsrq',
  sinr: 'sinr',
  throughputDl: 'downloadThroughput',
  throughputUl: 'uploadThroughput',
  availability: 'availability',
  dropRate: 'dropRate',
  latencyMs: 'latency',
  prbUtilization: 'prbUtilization',
};

const VALID_METRICS = Object.keys(METRIC_FIELD_MAP);

export async function GET(request: NextRequest) {
  try {
    await checkApiAuth(request);
  } catch {
    return authError();
  }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 120 });
  if (limited) return rateLimitResponse(resetMs);

  const { searchParams } = new URL(request.url);
  const metric = searchParams.get('metric') || 'rsrp';
  const technology = searchParams.get('technology') || undefined;

  if (!VALID_METRICS.includes(metric)) {
    return NextResponse.json(
      { error: `Invalid metric: ${metric}. Valid: ${VALID_METRICS.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const fieldName = METRIC_FIELD_MAP[metric];

    // Build where clause for KPI metrics
    const kpiWhere: Record<string, unknown> = {};
    if (technology) kpiWhere.technology = technology;

    // Fetch latest KPI metric per site with the requested field
    // Strategy: get all sites, then for each site get the latest metric
    const siteWhere: Record<string, unknown> = {};
    if (technology) siteWhere.technology = technology;

    const sites = await db.networkSite.findMany({
      where: siteWhere,
      select: {
        id: true,
        latitude: true,
        longitude: true,
        kpiMetrics: {
          where: kpiWhere,
          orderBy: { timestamp: 'desc' },
          take: 1,
          select: {
            rsrp: true,
            rsrq: true,
            sinr: true,
            downloadThroughput: true,
            uploadThroughput: true,
            availability: true,
            dropRate: true,
            latency: true,
            prbUtilization: true,
          },
        },
      },
    });

    const heatmap = sites
      .map((s) => {
        const latestMetric = s.kpiMetrics[0];
        if (!latestMetric) return null;
        const value = latestMetric[fieldName as keyof typeof latestMetric];
        if (value == null) return null;
        return {
          lat: s.latitude,
          lng: s.longitude,
          value: Number(Number(value).toFixed(2)),
          siteId: s.id,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    return NextResponse.json(heatmap);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
