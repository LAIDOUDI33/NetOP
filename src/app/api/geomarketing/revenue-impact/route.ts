import { NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { db } from '@/lib/db';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const zones = await db.revenueImpact.findMany({
      orderBy: { annualRevenueAtRisk: 'desc' },
      take: 500,
    });

    const mapped = zones.map(z => ({
      id: z.id,
      zoneName: z.zoneName,
      region: z.region,
      latitude: z.latitude,
      longitude: z.longitude,
      totalSubscribers: z.totalSubscribers,
      affectedSubscribers: z.affectedSubscribers,
      avgArpu: z.avgArpu,
      churnProbability: z.churnProbability,
      monthlyRevenueAtRisk: z.monthlyRevenueAtRisk,
      annualRevenueAtRisk: z.annualRevenueAtRisk,
      degradationCause: z.degradationCause,
      severity: z.severity,
      primaryKpi: z.primaryKpi,
      kpiBaseline: z.kpiBaseline,
      kpiCurrent: z.kpiCurrent,
      kpiDelta: z.kpiDelta,
      trendDirection: z.trendDirection,
      recommendedAction: z.recommendedAction,
      estimatedFixCost: z.estimatedFixCost,
      priorityScore: z.priorityScore,
      roiRatio: z.roiRatio,
      createdAt: z.createdAt.toISOString(),
      updatedAt: z.updatedAt.toISOString(),
    }));

    const totalAnnualRisk = mapped.reduce((s, z) => s + z.annualRevenueAtRisk, 0);
    const totalMonthlyRisk = mapped.reduce((s, z) => s + z.monthlyRevenueAtRisk, 0);
    const totalAffected = mapped.reduce((s, z) => s + z.affectedSubscribers, 0);
    const totalFixCost = mapped.reduce((s, z) => s + z.estimatedFixCost, 0);
    const avgChurnProb = mapped.length > 0
      ? Number((mapped.reduce((s, z) => s + z.churnProbability, 0) / mapped.length).toFixed(4))
      : 0;
    const avgPriorityScore = mapped.length > 0
      ? Number((mapped.reduce((s, z) => s + z.priorityScore, 0) / mapped.length).toFixed(2))
      : 0;
    const avgRoiRatio = mapped.length > 0
      ? Number((mapped.reduce((s, z) => s + z.roiRatio, 0) / mapped.length).toFixed(2))
      : 0;

    const bySeverity = {
      critical: mapped.filter(z => z.severity === 'critical').length,
      high: mapped.filter(z => z.severity === 'high').length,
      medium: mapped.filter(z => z.severity === 'medium').length,
      low: mapped.filter(z => z.severity === 'low').length,
    };

    const byCause = {
      coverage_gap: mapped.filter(z => z.degradationCause === 'coverage_gap').length,
      capacity_exhaustion: mapped.filter(z => z.degradationCause === 'capacity_exhaustion').length,
      interference: mapped.filter(z => z.degradationCause === 'interference').length,
      quality_degradation: mapped.filter(z => z.degradationCause === 'quality_degradation').length,
      outage: mapped.filter(z => z.degradationCause === 'outage').length,
    };

    const byTrend = {
      worsening: mapped.filter(z => z.trendDirection === 'worsening').length,
      stable: mapped.filter(z => z.trendDirection === 'stable').length,
      improving: mapped.filter(z => z.trendDirection === 'improving').length,
    };

    const byAction = {
      new_site: mapped.filter(z => z.recommendedAction === 'new_site').length,
      add_carrier: mapped.filter(z => z.recommendedAction === 'add_carrier').length,
      optimize: mapped.filter(z => z.recommendedAction === 'optimize').length,
      pci_replan: mapped.filter(z => z.recommendedAction === 'pci_replan').length,
      repair: mapped.filter(z => z.recommendedAction === 'repair').length,
      upgrade_site: mapped.filter(z => z.recommendedAction === 'upgrade_site').length,
    };

    const highestRiskZone = mapped.length > 0
      ? { zoneName: mapped[0].zoneName, annualRevenueAtRisk: mapped[0].annualRevenueAtRisk }
      : null;

    return NextResponse.json({
      zones: mapped,
      summary: {
        totalZones: mapped.length,
        totalAnnualRisk,
        totalMonthlyRisk,
        totalAffected,
        totalFixCost,
        avgChurnProb,
        avgPriorityScore,
        bySeverity,
        byCause,
        byTrend,
        byAction,
        avgRoiRatio,
        highestRiskZone,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
