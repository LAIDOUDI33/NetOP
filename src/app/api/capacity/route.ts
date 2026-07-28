import { z } from 'zod';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

const createCapacitySchema = z.object({
  siteId: z.string().min(1),
  technology: z.string().min(1),
  metric: z.string().min(1),
  currentValue: z.number(),
  forecastValue: z.number(),
});

export async function GET(request: NextRequest) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);
  const { searchParams } = new URL(request.url);
  const technology = searchParams.get('technology');
  const region = searchParams.get('region');
  const riskLevel = searchParams.get('riskLevel');

  try {
    const where: Record<string, unknown> = {};
    if (technology) where.technology = technology;
    if (region) where.region = region;
    if (riskLevel) where.riskLevel = riskLevel;

    const forecasts = await db.capacityForecast.findMany({
      where,
      include: { site: { select: { name: true, code: true, region: true } } },
      orderBy: { timestamp: 'desc' },
      take: 200,
    });

    const mapped = forecasts.map((f) => ({
      id: f.id,
      siteId: f.siteId,
      siteName: f.site?.name ?? null,
      siteCode: f.site?.code ?? null,
      technology: f.technology,
      region: f.region,
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
      createdAt: f.createdAt.toISOString(),
    }));

    const total = forecasts.length;
    const byRisk: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    let growthSum = 0;
    let sitesAtRisk = 0;

    for (const f of forecasts) {
      if (f.riskLevel in byRisk) {
        byRisk[f.riskLevel]++;
      } else {
        byRisk[f.riskLevel] = 1;
      }
      growthSum += f.growthRate;
      if (f.riskLevel === 'high' || f.riskLevel === 'critical') sitesAtRisk++;
    }

    return NextResponse.json({
      forecasts: mapped,
      summary: {
        total,
        byRisk,
        avgGrowthRate: total > 0 ? Number((growthSum / total).toFixed(2)) : 0,
        sitesAtRisk,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);
  try {
    const body = await request.json();
    const parsed = createCapacitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { siteId, technology, metric, currentValue, forecastValue } = parsed.data;

    // Auto-set region from site
    const site = await db.networkSite.findUnique({ where: { id: siteId }, select: { region: true, technology: true } });
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const forecast = await db.capacityForecast.create({
      data: {
        siteId,
        technology,
        region: site.region,
        metric,
        currentValue,
        forecastValue,
        forecastHorizon: '7d',
        growthRate: 0,
        riskLevel: 'low',
        confidence: 0.85,
        recommendation: '',
      },
    });

    return NextResponse.json(
      {
        id: forecast.id,
        siteId: forecast.siteId,
        technology: forecast.technology,
        region: forecast.region,
        metric: forecast.metric,
        currentValue: forecast.currentValue,
        forecastValue: forecast.forecastValue,
        forecastHorizon: forecast.forecastHorizon,
        growthRate: forecast.growthRate,
        capacityLimit: forecast.capacityLimit,
        utilizationAtLimit: forecast.utilizationAtLimit,
        confidence: forecast.confidence,
        riskLevel: forecast.riskLevel,
        recommendation: forecast.recommendation,
        timestamp: forecast.timestamp.toISOString(),
        createdAt: forecast.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}