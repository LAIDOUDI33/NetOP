import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, remaining } = rateLimit(request, { windowMs: 60_000, max: 60 });
  if (limited) return rateLimitResponse(remaining);
  try {
    const { searchParams } = new URL(request.url);
    const segment = searchParams.get('segment');
    const metric = searchParams.get('metric');

    const where: Record<string, unknown> = {};
    if (segment) where.segment = segment;
    if (metric) where.metric = metric;

    const projections = await db.revenueProjection.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const results = projections.map((r) => ({
      id: r.id,
      segment: r.segment,
      metric: r.metric,
      currentMonthly: r.currentMonthly,
      forecastPoints: JSON.parse(r.forecastPoints),
      growthRate: r.growthRate,
      annualGrowthRate: r.annualGrowthRate,
      confidence: r.confidence,
      riskFactors: JSON.parse(r.riskFactors),
      trendDirection: r.trendDirection,
      seasonalityIndex: r.seasonalityIndex,
      horizon: r.horizon,
      createdAt: r.createdAt.toISOString(),
    }));

    // Aggregations
    const totalMonthly = projections.reduce(
      (s, r) => s + r.currentMonthly,
      0
    );
    const avgGrowthRate =
      projections.length > 0
        ? projections.reduce((s, r) => s + r.growthRate, 0) /
          projections.length
        : 0;
    const avgConfidence =
      projections.length > 0
        ? projections.reduce((s, r) => s + r.confidence, 0) /
          projections.length
        : 0;

    // Segment breakdown
    const segmentMap = new Map<string, number>();
    for (const p of projections) {
      segmentMap.set(
        p.segment,
        (segmentMap.get(p.segment) || 0) + p.currentMonthly
      );
    }
    const segmentBreakdown = Object.fromEntries(segmentMap);

    return NextResponse.json({
      total: projections.length,
      totalMonthly: Math.round(totalMonthly * 100) / 100,
      avgGrowthRate: Math.round(avgGrowthRate * 100) / 100,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      segmentBreakdown,
      projections: results,
    });
  } catch (error) {
    console.error('[predictive/revenue] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load revenue projections' },
      { status: 500 }
    );
  }
}
