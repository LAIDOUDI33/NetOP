import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const technology = searchParams.get('technology');
  const metric = searchParams.get('metric');
  const region = searchParams.get('region');

  try {
    const where: Record<string, unknown> = {};
    if (technology) where.technology = technology;
    if (metric) where.metric = metric;
    if (region) where.region = region;

    const records = await db.trendForecast.findMany({
      where,
      include: { site: { select: { name: true, code: true, technology: true, region: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const mapped = records.map((r) => ({
      id: r.id,
      siteId: r.siteId,
      siteName: r.site?.name ?? null,
      siteCode: r.site?.code ?? null,
      technology: r.technology,
      region: r.region,
      metric: r.metric,
      forecastPoints: JSON.parse(r.forecastPoints),
      horizon: r.horizon,
      trendDirection: r.trendDirection,
      confidence: r.confidence,
      recommendation: r.recommendation,
      timestamp: r.timestamp.toISOString(),
      createdAt: r.createdAt.toISOString(),
    }));

    const total = records.length;
    const byMetric: Record<string, number> = {};
    const byHorizon: Record<string, number> = {};
    const byDirection: Record<string, number> = {};
    const byTech: Record<string, number> = {};
    let avgConfidence = 0;

    for (const r of records) {
      byMetric[r.metric] = (byMetric[r.metric] || 0) + 1;
      byHorizon[r.horizon] = (byHorizon[r.horizon] || 0) + 1;
      byDirection[r.trendDirection] = (byDirection[r.trendDirection] || 0) + 1;
      byTech[r.technology] = (byTech[r.technology] || 0) + 1;
      avgConfidence += r.confidence;
    }

    return NextResponse.json({
      trends: mapped,
      summary: {
        total,
        byMetric,
        byHorizon,
        byDirection,
        byTech,
        avgConfidence: total > 0 ? Number((avgConfidence / total).toFixed(2)) : 0,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}