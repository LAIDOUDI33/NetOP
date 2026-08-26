import { NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { db } from '@/lib/db';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const gaps = await db.geoCoverageGap.findMany({
      orderBy: { priorityScore: 'desc' },
      take: 500,
    });

    const mapped = gaps.map(g => ({
      id: g.id,
      gapName: g.gapName,
      region: g.region,
      latitude: g.latitude,
      longitude: g.longitude,
      radiusKm: g.radiusKm,
      populationServed: g.populationServed,
      coveragePct: g.coveragePct,
      gapSeverity: g.gapSeverity,
      currentSites: g.currentSites,
      requiredSites: g.requiredSites,
      estimatedRevenue: g.estimatedRevenue,
      priorityScore: g.priorityScore,
      technology: g.technology,
      recommendedAction: g.recommendedAction,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    }));

    const totalPopServed = mapped.reduce((s, g) => s + g.populationServed, 0);
    const avgCoverage = mapped.length > 0
      ? Number((mapped.reduce((s, g) => s + g.coveragePct, 0) / mapped.length).toFixed(1))
      : 0;
    const totalEstRevenue = mapped.reduce((s, g) => s + g.estimatedRevenue, 0);
    const totalSitesNeeded = mapped.reduce((s, g) => s + (g.requiredSites - g.currentSites), 0);
    const criticalCount = mapped.filter(g => g.gapSeverity === 'critical').length;
    const highCount = mapped.filter(g => g.gapSeverity === 'high').length;
    const mediumCount = mapped.filter(g => g.gapSeverity === 'medium').length;
    const lowCount = mapped.filter(g => g.gapSeverity === 'low').length;

    // By region
    const byRegion: Record<string, number> = {};
    for (const g of mapped) {
      byRegion[g.region] = (byRegion[g.region] || 0) + 1;
    }

    // By technology
    const byTech: Record<string, number> = {};
    for (const g of mapped) {
      byTech[g.technology] = (byTech[g.technology] || 0) + 1;
    }

    // By action
    const byAction: Record<string, number> = {};
    for (const g of mapped) {
      byAction[g.recommendedAction] = (byAction[g.recommendedAction] || 0) + 1;
    }

    return NextResponse.json({
      gaps: mapped,
      summary: {
        totalGaps: mapped.length,
        totalPopServed,
        avgCoverage,
        totalEstRevenue,
        totalSitesNeeded,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        byRegion,
        byTech,
        byAction,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
