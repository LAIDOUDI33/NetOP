import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkApiAuth, authError } from '@/lib/api-auth';

/**
 * GET /api/assistant/summary
 * Returns a compact JSON snapshot of current network state.
 * Uses only Prisma aggregates (count, groupBy, avg) — no raw SQL.
 */
export async function GET(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  try {
    const [
      sitesByTech,
      sitesByStatus,
      siteTotal,
      alertsBySeverity,
      alertActive,
      avgKpis,
      capacityByRisk,
      capacityHighCritical,
      churnIncreasing,
      faultCriticalHigh,
      anomalyActive,
      anomalyToday,
      subscriberSegments,
    ] = await Promise.all([
      // --- Sites ---
      db.networkSite.groupBy({ by: ['technology'], _count: true }),
      db.networkSite.groupBy({ by: ['status'], _count: true }),
      db.networkSite.count(),

      // --- Alerts ---
      db.alert.groupBy({ by: ['severity'], where: { acknowledged: false }, _count: true }),
      db.alert.count({ where: { acknowledged: false } }),

      // --- KPIs ---
      db.kpiMetric.aggregate({
        _avg: {
          rsrp: true,
          downloadThroughput: true,
          uploadThroughput: true,
          latency: true,
          availability: true,
        },
      }),

      // --- Capacity ---
      db.capacityForecast.groupBy({ by: ['riskLevel'], _count: true }),
      db.capacityForecast.count({ where: { riskLevel: { in: ['high', 'critical'] } } }),

      // --- Churn ---
      db.churnPrediction.count({ where: { churnTrend: 'increasing' } }),

      // --- Fault predictions ---
      db.faultPrediction.count({ where: { severity: { in: ['critical', 'high'] } } }),

      // --- Anomalies ---
      db.anomalyEvent.count({ where: { status: 'detected' } }),
      db.anomalyEvent.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),

      // --- Subscriber segments ---
      db.subscriberSegment.findMany({
        select: {
          segmentName: true,
          technology: true,
          subscriberCount: true,
          churnRisk: true,
        },
      }),
    ]);

    // Build clean lookup maps
    const byTech: Record<string, number> = {};
    for (const row of sitesByTech) byTech[row.technology] = row._count;

    const byStatus: Record<string, number> = {};
    for (const row of sitesByStatus) byStatus[row.status] = row._count;

    const alertBySev: Record<string, number> = {};
    for (const row of alertsBySeverity) alertBySev[row.severity] = row._count;

    const capByRisk: Record<string, number> = {};
    for (const row of capacityByRisk) capByRisk[row.riskLevel] = row._count;

    // Aggregate subscriber counts by segment name
    const segments: Record<string, number> = {};
    for (const seg of subscriberSegments) {
      const key = seg.segmentName;
      segments[key] = (segments[key] || 0) + seg.subscriberCount;
    }

    return NextResponse.json({
      sites: {
        total: siteTotal,
        byTech,
        byStatus,
      },
      alerts: {
        active: alertActive,
        critical: alertBySev['critical'] ?? 0,
        bySeverity: alertBySev,
      },
      kpis: {
        avgRsrp: round2(avgKpis._avg.rsrp),
        avgThroughput: round2(avgKpis._avg.downloadThroughput),
        avgAvailability: round2(avgKpis._avg.availability),
      },
      predictions: {
        highRiskCapacity: capacityHighCritical,
        increasingChurn: churnIncreasing,
        criticalFaults: faultCriticalHigh,
      },
      anomalies: {
        active: anomalyActive,
        today: anomalyToday,
      },
      capacity: {
        byRiskLevel: capByRisk,
      },
      subscriberSegments: segments,
    });
  } catch {
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 },
    );
  }
}

function round2(value: number | null | undefined): number | null {
  if (value == null) return null;
  return Math.round(value * 100) / 100;
}
