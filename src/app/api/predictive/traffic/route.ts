import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region');
    const technology = searchParams.get('technology');
    const metric = searchParams.get('metric');

    const where: Record<string, unknown> = {};
    if (region) where.region = region;
    if (technology) where.technology = technology;
    if (metric) where.metric = metric;

    const forecasts = await db.trafficForecast.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const results = forecasts.map((t) => ({
      id: t.id,
      region: t.region,
      technology: t.technology,
      metric: t.metric,
      currentDailyAvg: t.currentDailyAvg,
      forecastedDailyAvg: t.forecastedDailyAvg,
      growthRate: t.growthRate,
      peakHour: t.peakHour,
      peakDay: t.peakDay,
      seasonality: t.seasonality,
      forecastPoints: JSON.parse(t.forecastPoints),
      horizon: t.horizon,
      confidence: t.confidence,
      trendDirection: t.trendDirection,
      createdAt: t.createdAt.toISOString(),
    }));

    // Trend distribution
    const trendDist: Record<string, number> = {};
    for (const f of forecasts) {
      trendDist[f.trendDirection] =
        (trendDist[f.trendDirection] || 0) + 1;
    }

    // Average growth rate
    const avgGrowthRate =
      forecasts.length > 0
        ? forecasts.reduce((s, f) => s + f.growthRate, 0) / forecasts.length
        : 0;

    return NextResponse.json({
      total: forecasts.length,
      avgGrowthRate: Math.round(avgGrowthRate * 100) / 100,
      trendDistribution: trendDist,
      forecasts: results,
    });
  } catch (error) {
    console.error('[predictive/traffic] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load traffic forecasts' },
      { status: 500 }
    );
  }
}
