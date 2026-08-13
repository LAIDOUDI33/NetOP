import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const { limited, remaining } = rateLimit(request, { windowMs: 60_000, max: 60 });
  if (limited) return rateLimitResponse(remaining);
  try {
    const { searchParams } = new URL(request.url);
    const wilaya = searchParams.get('wilaya');
    const segment = searchParams.get('segment');
    const trend = searchParams.get('trend');

    const where: Record<string, unknown> = {};
    if (wilaya) where.wilaya = wilaya;
    if (segment) where.segmentName = segment;
    if (trend) where.churnTrend = trend;

    const predictions = await db.churnPrediction.findMany({
      where,
      orderBy: { predictionDate: 'desc' },
    });

    // Aggregations
    const totalAtRisk = predictions.reduce((s, c) => s + c.atRiskCount, 0);
    const totalHighRisk = predictions.reduce(
      (s, c) => s + c.highRiskCount,
      0
    );
    const totalRevenueAtRisk = predictions.reduce(
      (s, c) => s + c.revenueAtRisk,
      0
    );
    const totalSubscribers = predictions.reduce(
      (s, c) => s + c.totalSubscribers,
      0
    );
    const avgChurnRate =
      predictions.length > 0
        ? predictions.reduce((s, c) => s + c.predictedChurnRate, 0) /
          predictions.length
        : 0;

    const results = predictions.map((p) => ({
      id: p.id,
      wilaya: p.wilaya,
      segmentName: p.segmentName,
      technology: p.technology,
      totalSubscribers: p.totalSubscribers,
      atRiskCount: p.atRiskCount,
      highRiskCount: p.highRiskCount,
      churnRate: p.churnRate,
      predictedChurnRate: p.predictedChurnRate,
      churnTrend: p.churnTrend,
      drivers: JSON.parse(p.drivers),
      confidence: p.confidence,
      revenueAtRisk: p.revenueAtRisk,
      predictionDate: p.predictionDate.toISOString(),
      horizon: p.horizon,
    }));

    return NextResponse.json({
      total: predictions.length,
      totalAtRisk,
      totalHighRisk,
      totalRevenueAtRisk,
      totalSubscribers,
      avgChurnRate: Math.round(avgChurnRate * 10000) / 10000,
      predictions: results,
    });
  } catch (error) {
    console.error('[predictive/churn] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load churn predictions' },
      { status: 500 }
    );
  }
}
