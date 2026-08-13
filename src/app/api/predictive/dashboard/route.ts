import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, remaining } = rateLimit(request, { windowMs: 60_000, max: 60 });
  if (limited) return rateLimitResponse(remaining);
  try {
    const [
      capacityForecasts,
      churnPredictions,
      faultPredictions,
      trafficForecasts,
      revenueProjections,
    ] = await Promise.all([
      db.capacityForecast.findMany({ orderBy: { timestamp: 'desc' } }),
      db.churnPrediction.findMany({ orderBy: { predictionDate: 'desc' } }),
      db.faultPrediction.findMany({ orderBy: { createdAt: 'desc' } }),
      db.trafficForecast.findMany({ orderBy: { createdAt: 'desc' } }),
      db.revenueProjection.findMany({ orderBy: { createdAt: 'desc' } }),
    ]);

    // Capacity summary
    const capacityHighRisk = capacityForecasts.filter(
      (f) => f.riskLevel === 'high' || f.riskLevel === 'critical'
    );
    const capacityCritical = capacityForecasts.filter(
      (f) => f.riskLevel === 'critical'
    );
    const capacityAvgConfidence =
      capacityForecasts.length > 0
        ? capacityForecasts.reduce((s, f) => s + f.confidence, 0) /
          capacityForecasts.length
        : 0;

    // Churn summary
    const totalAtRisk = churnPredictions.reduce((s, c) => s + c.atRiskCount, 0);
    const totalRevenueAtRisk = churnPredictions.reduce(
      (s, c) => s + c.revenueAtRisk,
      0
    );
    const highRiskWilayas = churnPredictions
      .filter((c) => c.highRiskCount > 0)
      .map((c) => c.wilaya);

    // Fault summary
    const criticalFaults = faultPredictions.filter(
      (f) => f.severity === 'critical'
    );
    const faultAvgProbability =
      faultPredictions.length > 0
        ? faultPredictions.reduce((s, f) => s + f.probability, 0) /
          faultPredictions.length
        : 0;

    // Traffic summary
    const trafficAvgGrowth =
      trafficForecasts.length > 0
        ? trafficForecasts.reduce((s, t) => s + t.growthRate, 0) /
          trafficForecasts.length
        : 0;
    const growingRegions = [
      ...new Set(
        trafficForecasts
          .filter((t) => t.trendDirection === 'growing')
          .map((t) => t.region)
      ),
    ];
    const decliningRegions = [
      ...new Set(
        trafficForecasts
          .filter((t) => t.trendDirection === 'declining')
          .map((t) => t.region)
      ),
    ];

    // Revenue summary
    const totalMonthly = revenueProjections.reduce(
      (s, r) => s + r.currentMonthly,
      0
    );
    const revenueAvgGrowth =
      revenueProjections.length > 0
        ? revenueProjections.reduce((s, r) => s + r.growthRate, 0) /
          revenueProjections.length
        : 0;
    const riskCount = revenueProjections.filter(
      (r) => r.trendDirection === 'declining'
    ).length;

    return NextResponse.json({
      capacity: {
        total: capacityForecasts.length,
        highRisk: capacityHighRisk.length,
        avgConfidence: Math.round(capacityAvgConfidence * 100) / 100,
        criticalCount: capacityCritical.length,
      },
      churn: {
        totalAtRisk,
        totalRevenue: totalRevenueAtRisk,
        highRiskWilayas,
      },
      fault: {
        total: faultPredictions.length,
        critical: criticalFaults.length,
        avgProbability: Math.round(faultAvgProbability * 100) / 100,
      },
      traffic: {
        avgGrowth: Math.round(trafficAvgGrowth * 100) / 100,
        growingRegions,
        decliningRegions,
      },
      revenue: {
        totalMonthly: Math.round(totalMonthly * 100) / 100,
        avgGrowth: Math.round(revenueAvgGrowth * 100) / 100,
        riskCount,
      },
    });
  } catch (error) {
    console.error('[predictive/dashboard] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard summary' },
      { status: 500 }
    );
  }
}
