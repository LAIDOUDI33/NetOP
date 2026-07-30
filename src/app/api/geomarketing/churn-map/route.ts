import { NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const clusters = await db.geoChurnCluster.findMany({
      orderBy: { avgChurnRate: 'desc' },
      take: 500,
    });

    const mapped = clusters.map(c => ({
      id: c.id,
      clusterName: c.clusterName,
      region: c.region,
      latitude: c.latitude,
      longitude: c.longitude,
      radiusKm: c.radiusKm,
      avgChurnRate: c.avgChurnRate,
      subscriberCount: c.subscriberCount,
      atRiskCount: c.atRiskCount,
      severity: c.severity,
      primaryCause: c.primaryCause,
      trendDirection: c.trendDirection,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    const totalAtRisk = mapped.reduce((s, c) => s + c.atRiskCount, 0);
    const avgChurnRate = mapped.length > 0
      ? Number((mapped.reduce((s, c) => s + c.avgChurnRate, 0) / mapped.length).toFixed(2))
      : 0;
    const criticalCount = mapped.filter(c => c.severity === 'critical').length;
    const highCount = mapped.filter(c => c.severity === 'high').length;
    const mediumCount = mapped.filter(c => c.severity === 'medium').length;
    const lowCount = mapped.filter(c => c.severity === 'low').length;

    return NextResponse.json({
      clusters: mapped,
      summary: {
        totalClusters: mapped.length,
        totalAtRisk,
        avgChurnRate,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
