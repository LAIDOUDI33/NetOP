import { NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { db } from '@/lib/db';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const zones = await db.networkCommercialInsight.findMany({
      orderBy: { compositeScore: 'desc' },
      take: 500,
    });

    const mapped = zones.map(z => ({
      id: z.id,
      zoneName: z.zoneName,
      region: z.region,
      avgRsrp: z.avgRsrp,
      avgRsrq: z.avgRsrq,
      avgSinr: z.avgSinr,
      avgThroughputDl: z.avgThroughputDl,
      avgThroughputUl: z.avgThroughputUl,
      avgAvailability: z.avgAvailability,
      avgDropRate: z.avgDropRate,
      avgLatencyMs: z.avgLatencyMs,
      avgPrbUtilization: z.avgPrbUtilization,
      avgArpu: z.avgArpu,
      totalRevenue: z.totalRevenue,
      subscriberCount: z.subscriberCount,
      churnRate: z.churnRate,
      marketPenetration: z.marketPenetration,
      satisfactionScore: z.satisfactionScore,
      rsrpVsChurn: z.rsrpVsChurn,
      throughputVsArpu: z.throughputVsArpu,
      availabilityVsRevenue: z.availabilityVsRevenue,
      dropRateVsChurn: z.dropRateVsChurn,
      latencyVsSatisfaction: z.latencyVsSatisfaction,
      prbUtilVsThroughput: z.prbUtilVsThroughput,
      networkScore: z.networkScore,
      commercialScore: z.commercialScore,
      compositeScore: z.compositeScore,
      revenueLeakageEst: z.revenueLeakageEst,
      periodMonth: z.periodMonth,
      periodYear: z.periodYear,
      createdAt: z.createdAt.toISOString(),
      updatedAt: z.updatedAt.toISOString(),
    }));

    // ── Summary computations ──────────────────────────────────────────

    const totalZones = mapped.length;

    const avgCompositeScore = mapped.length > 0
      ? Number((mapped.reduce((s, z) => s + z.compositeScore, 0) / mapped.length).toFixed(2))
      : 0;

    const avgNetworkScore = mapped.length > 0
      ? Number((mapped.reduce((s, z) => s + z.networkScore, 0) / mapped.length).toFixed(2))
      : 0;

    const avgCommercialScore = mapped.length > 0
      ? Number((mapped.reduce((s, z) => s + z.commercialScore, 0) / mapped.length).toFixed(2))
      : 0;

    const totalRevenueLeakage = mapped.reduce((s, z) => s + z.revenueLeakageEst, 0);

    // Correlation pairs
    const correlationPairs = [
      { pair: 'RSRP → Churn', value: 'rsrpVsChurn' as const },
      { pair: 'Throughput → ARPU', value: 'throughputVsArpu' as const },
      { pair: 'Availability → Revenue', value: 'availabilityVsRevenue' as const },
      { pair: 'Drop Rate → Churn', value: 'dropRateVsChurn' as const },
      { pair: 'Latency → Satisfaction', value: 'latencyVsSatisfaction' as const },
      { pair: 'PRB Util → Throughput', value: 'prbUtilVsThroughput' as const },
    ];

    // Average correlation strength (mean of |R| across all 6 coefficients)
    const avgCorrelationStrength = mapped.length > 0
      ? Number((
          correlationPairs.reduce((s, p) =>
            s + Math.abs(mapped.reduce((a, z) => a + z[p.value], 0) / mapped.length), 0)
          / correlationPairs.length
        ).toFixed(4))
      : 0;

    // Find strongest and weakest correlations (by average |R| across zones)
    const correlationAvgs = correlationPairs.map(p => ({
      pair: p.pair,
      value: Number((
        mapped.reduce((s, z) => s + z[p.value], 0) / mapped.length
      ).toFixed(4)),
    }));

    const strongestCorrelation = correlationAvgs.length > 0
      ? correlationAvgs.reduce((best, c) =>
          Math.abs(c.value) > Math.abs(best.value) ? c : best)
      : null;

    const weakestCorrelation = correlationAvgs.length > 0
      ? correlationAvgs.reduce((worst, c) =>
          Math.abs(c.value) < Math.abs(worst.value) ? c : worst)
      : null;

    // Correlation matrix: 6 network KPIs × their correlation with commercial KPIs
    const correlationMatrix: {
      networkKpi: string;
      correlations: { commercialKpi: string; r: number }[];
    }[] = [
      {
        networkKpi: 'RSRP',
        correlations: [
          { commercialKpi: 'Churn', r: correlationAvgs[0].value },
        ],
      },
      {
        networkKpi: 'Throughput',
        correlations: [
          { commercialKpi: 'ARPU', r: correlationAvgs[1].value },
        ],
      },
      {
        networkKpi: 'Availability',
        correlations: [
          { commercialKpi: 'Revenue', r: correlationAvgs[2].value },
        ],
      },
      {
        networkKpi: 'Drop Rate',
        correlations: [
          { commercialKpi: 'Churn', r: correlationAvgs[3].value },
        ],
      },
      {
        networkKpi: 'Latency',
        correlations: [
          { commercialKpi: 'Satisfaction', r: correlationAvgs[4].value },
        ],
      },
      {
        networkKpi: 'PRB Utilization',
        correlations: [
          { commercialKpi: 'Throughput', r: correlationAvgs[5].value },
        ],
      },
    ];

    // Aggregate by region
    const regionMap = new Map<string, { count: number; compositeScoreSum: number; networkScoreSum: number; commercialScoreSum: number }>();
    for (const z of mapped) {
      const entry = regionMap.get(z.region) ?? { count: 0, compositeScoreSum: 0, networkScoreSum: 0, commercialScoreSum: 0 };
      entry.count++;
      entry.compositeScoreSum += z.compositeScore;
      entry.networkScoreSum += z.networkScore;
      entry.commercialScoreSum += z.commercialScore;
      regionMap.set(z.region, entry);
    }

    const byRegion = Array.from(regionMap.entries()).map(([region, data]) => ({
      region,
      zoneCount: data.count,
      avgCompositeScore: Number((data.compositeScoreSum / data.count).toFixed(2)),
      avgNetworkScore: Number((data.networkScoreSum / data.count).toFixed(2)),
      avgCommercialScore: Number((data.commercialScoreSum / data.count).toFixed(2)),
    }));

    return NextResponse.json({
      zones: mapped,
      summary: {
        totalZones,
        avgCompositeScore,
        avgNetworkScore,
        avgCommercialScore,
        totalRevenueLeakage,
        avgCorrelationStrength,
        strongestCorrelation,
        weakestCorrelation,
        correlationMatrix,
        byRegion,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
