import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { z } from 'zod';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { db } from '@/lib/db';
import { checkApiAuth, authError } from '@/lib/api-auth';

const querySchema = z.object({
  question: z.string().min(1).max(2000),
});

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

/**
 * Fetches lightweight aggregates from all relevant DB tables.
 * All queries run in parallel for speed.
 */
async function fetchNetworkDataSummary() {
  const [
    sitesByTech,
    sitesByStatus,
    sitesByRegion,
    alertsBySeverity,
    alertTotal,
    avgKpis,
    churnWilayas,
    capacityHighRisk,
    anomalyActiveCount,
    anomalyTodayCount,
    subscriberSegments,
  ] = await Promise.all([
    // Sites grouped by technology
    db.networkSite.groupBy({ by: ['technology'], _count: true }),
    // Sites grouped by status
    db.networkSite.groupBy({ by: ['status'], _count: true }),
    // Sites grouped by region (wilaya)
    db.networkSite.groupBy({ by: ['region'], _count: true }),
    // Alerts grouped by severity (unacknowledged only)
    db.alert.groupBy({
      by: ['severity'],
      where: { acknowledged: false },
      _count: true,
    }),
    // Total active alert count
    db.alert.count({ where: { acknowledged: false } }),
    // Average KPI metrics
    db.kpiMetric.aggregate({
      _avg: {
        rsrp: true,
        rsrq: true,
        sinr: true,
        downloadThroughput: true,
        uploadThroughput: true,
        latency: true,
        availability: true,
        prbUtilization: true,
        handoverSuccessRate: true,
        dropRate: true,
      },
    }),
    // Top at-risk churn wilayas (increasing trend, ordered by highRiskCount desc)
    db.churnPrediction.findMany({
      where: { churnTrend: 'increasing' },
      orderBy: { highRiskCount: 'desc' },
      take: 10,
      select: {
        wilaya: true,
        segmentName: true,
        totalSubscribers: true,
        atRiskCount: true,
        highRiskCount: true,
        churnRate: true,
        predictedChurnRate: true,
        churnTrend: true,
        revenueAtRisk: true,
      },
    }),
    // Capacity forecasts grouped by risk level
    db.capacityForecast.groupBy({ by: ['riskLevel'], _count: true }),
    // Anomaly count (active / detected status)
    db.anomalyEvent.count({ where: { status: 'detected' } }),
    // Anomalies detected today
    db.anomalyEvent.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    // Subscriber segment data
    db.subscriberSegment.findMany({
      select: {
        segmentName: true,
        technology: true,
        subscriberCount: true,
        avgDataUsage: true,
        arpu: true,
        churnRisk: true,
        satisfactionScore: true,
      },
    }),
  ]);

  // Build clean lookup objects from groupBy results
  const byTech: Record<string, number> = {};
  for (const row of sitesByTech) byTech[row.technology] = row._count;

  const byStatus: Record<string, number> = {};
  for (const row of sitesByStatus) byStatus[row.status] = row._count;

  const byRegion: Record<string, number> = {};
  for (const row of sitesByRegion) byRegion[row.region] = row._count;

  const bySeverity: Record<string, number> = {};
  for (const row of alertsBySeverity) bySeverity[row.severity] = row._count;

  const capacityRisk: Record<string, number> = {};
  for (const row of capacityHighRisk) capacityRisk[row.riskLevel] = row._count;

  return {
    sites: { byTech, byStatus, byRegion },
    alerts: { total: alertTotal, bySeverity },
    kpis: {
      avgRsrp: avgKpis._avg.rsrp,
      avgRsrq: avgKpis._avg.rsrq,
      avgSinr: avgKpis._avg.sinr,
      avgDownloadThroughput: avgKpis._avg.downloadThroughput,
      avgUploadThroughput: avgKpis._avg.uploadThroughput,
      avgLatency: avgKpis._avg.latency,
      avgAvailability: avgKpis._avg.availability,
      avgPrbUtilization: avgKpis._avg.prbUtilization,
      avgHandoverSuccessRate: avgKpis._avg.handoverSuccessRate,
      avgDropRate: avgKpis._avg.dropRate,
    },
    churn: { topAtRiskWilayas: churnWilayas },
    capacity: { byRiskLevel: capacityRisk },
    anomalies: { active: anomalyActiveCount, today: anomalyTodayCount },
    subscriberSegments,
  };
}

/**
 * Infers which data sources the answer likely references
 * based on keyword matching in the question.
 */
function inferDataSources(
  question: string,
  data: Awaited<ReturnType<typeof fetchNetworkDataSummary>>,
): string[] {
  const q = question.toLowerCase();
  const sources: string[] = [];

  if (/site|cell|tower|basestation|station/.test(q)) sources.push('networkSites');
  if (/alert|alarm|warning|critical|severity/.test(q)) sources.push('alerts');
  if (/kpi|rsrp|rsrq|sinr|throughput|latency|availability|prb|handover|drop/.test(q)) sources.push('kpiMetrics');
  if (/churn|subscriber|customer|retention|wilaya|region/.test(q)) sources.push('churnPrediction');
  if (/capacity|utilization|forecast|growth|load/.test(q)) sources.push('capacityForecast');
  if (/anomal|deviation|outlier|z-score/.test(q)) sources.push('anomalyEvents');
  if (/segment|arpu|data.?usage|revenue/.test(q)) sources.push('subscriberSegments');

  return sources.length > 0 ? sources : ['networkSites', 'alerts', 'kpiMetrics'];
}

export async function POST(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 20 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const body = await request.json();
    const parsed = querySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { question } = parsed.data;

    // Fetch real-time data from DB (all queries in parallel)
    const dataSummary = await fetchNetworkDataSummary();
    const dataSource = inferDataSources(question, dataSummary);

    const zai = await getZai();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: [
            'You are NetOptima Algérie AI Assistant, an expert telecom data analyst.',
            'You have REAL-TIME access to the following network data from the NetOptima DZ database.',
            "Answer the user's question by analyzing this data. Be specific with numbers, percentages, and comparisons.",
            "If the data doesn't fully answer the question, state what additional data would be needed.",
            'Keep responses concise but data-rich. Use bullet points for multi-part answers.',
            '',
            '=== CURRENT NETWORK DATA ===',
            JSON.stringify(dataSummary, null, 2),
            '=== END DATA ===',
            '',
            'Important context: This is a mobile network in Algeria (DZ) covering 2G/3G/4G/5G technologies.',
            'Regions are Algerian wilayas. Churn predictions are per-wilaya.',
            'KPIs: RSRP (dBm, higher/less negative is better), RSRQ (dB, higher is better),',
            'SINR (dB, higher is better), throughput (Mbps), latency (ms, lower is better),',
            'availability (%), PRB utilization (%, lower headroom = congestion risk).',
          ].join('\n'),
        },
        {
          role: 'user',
          content: question,
        },
      ],
      thinking: { type: 'disabled' },
    });

    const answer =
      completion.choices?.[0]?.message?.content || 'Unable to generate an answer at this time.';

    // Infer confidence based on how many data sources are relevant
    const confidence =
      dataSource.length >= 3 ? 'high' : dataSource.length >= 2 ? 'medium' : 'low';

    return NextResponse.json({ answer, dataSource, confidence });
  } catch {
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 },
    );
  }
}
