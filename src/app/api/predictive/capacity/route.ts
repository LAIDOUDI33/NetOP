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
    const technology = searchParams.get('technology');
    const region = searchParams.get('region');
    const riskLevel = searchParams.get('riskLevel');

    const where: Record<string, unknown> = {};
    if (technology) where.technology = technology;
    if (region) where.region = region;
    if (riskLevel) where.riskLevel = riskLevel;

    const forecasts = await db.capacityForecast.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    });

    // Group by region
    const regionMap = new Map<string, (typeof forecasts)>();
    for (const f of forecasts) {
      const existing = regionMap.get(f.region) || [];
      existing.push(f);
      regionMap.set(f.region, existing);
    }

    const regionGroups = Array.from(regionMap.entries()).map(
      ([r, items]) => {
        const riskCounts = { low: 0, medium: 0, high: 0, critical: 0 };
        for (const item of items) {
          const key = item.riskLevel as keyof typeof riskCounts;
          if (key in riskCounts) riskCounts[key]++;
        }
        return {
          region: r,
          count: items.length,
          riskCounts,
          forecasts: items.map((f) => ({
            id: f.id,
            siteId: f.siteId,
            technology: f.technology,
            metric: f.metric,
            currentValue: f.currentValue,
            forecastValue: f.forecastValue,
            forecastHorizon: f.forecastHorizon,
            growthRate: f.growthRate,
            capacityLimit: f.capacityLimit,
            utilizationAtLimit: f.utilizationAtLimit,
            confidence: f.confidence,
            riskLevel: f.riskLevel,
            recommendation: f.recommendation,
            timestamp: f.timestamp.toISOString(),
          })),
        };
      }
    );

    return NextResponse.json({
      total: forecasts.length,
      regions: regionGroups,
    });
  } catch (error) {
    console.error('[predictive/capacity] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load capacity forecasts' },
      { status: 500 }
    );
  }
}
