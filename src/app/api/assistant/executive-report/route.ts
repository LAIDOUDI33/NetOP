import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { z } from 'zod';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { db } from '@/lib/db';
import { checkApiAuth, authError } from '@/lib/api-auth';

// ---------- Schema ----------
const reportSchema = z.object({
  reportType: z.enum(['network_health', 'performance', 'capacity', 'financial', 'comprehensive']),
  region: z.string().optional(),
  technology: z.string().optional(),
  period: z.string().optional(),
  language: z.enum(['en', 'fr', 'ar']).default('en'),
});

type ReportType = z.infer<typeof reportSchema>['reportType'];
type Lang = z.infer<typeof reportSchema>['language'];

// ---------- ZAI singleton ----------
let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

// ---------- Helpers ----------
function fmt(v: number | null | undefined, decimals = 1): string {
  if (v == null) return 'N/A';
  return Number(v).toFixed(decimals);
}

function pct(v: number | null | undefined): string {
  if (v == null) return 'N/A';
  return `${Number(v).toFixed(1)}%`;
}

function buildWhere(region?: string, technology?: string) {
  const w: Record<string, unknown> = {};
  if (region && region !== 'ALL') w.region = region;
  if (technology && technology !== 'ALL') w.technology = technology;
  return w;
}

// ---------- Data Aggregation ----------
async function fetchNetworkHealthData(region?: string, technology?: string) {
  const where = buildWhere(region, technology);

  const [healthStats, alertCounts, outageCounts, anomalyCounts, topHealth, bottomHealth] =
    await Promise.all([
      db.healthScore.aggregate({
        _avg: { overallScore: true, coverageScore: true, capacityScore: true, qualityScore: true, reliabilityScore: true, experienceScore: true },
        _count: true,
      }),
      db.alert.groupBy({ by: ['severity'], _count: true, where }),
      db.outageEvent.count({ where: { ...where, status: 'active' } }),
      db.anomalyEvent.count({ where: { ...where, status: 'detected' } }),
      db.healthScore.findMany({ where, orderBy: { overallScore: 'desc' }, take: 5, include: { site: { select: { name: true, region: true } } } }),
      db.healthScore.findMany({ where, orderBy: { overallScore: 'asc' }, take: 5, include: { site: { select: { name: true, region: true } } } }),
    ]);

  const severityMap: Record<string, number> = {};
  for (const a of alertCounts) severityMap[a.severity] = a._count;

  return {
    healthStats: {
      avgOverallScore: fmt(healthStats._avg.overallScore),
      avgCoverageScore: fmt(healthStats._avg.coverageScore),
      avgCapacityScore: fmt(healthStats._avg.capacityScore),
      avgQualityScore: fmt(healthStats._avg.qualityScore),
      avgReliabilityScore: fmt(healthStats._avg.reliabilityScore),
      avgExperienceScore: fmt(healthStats._avg.experienceScore),
      totalRecords: healthStats._count,
    },
    alertsBySeverity: severityMap,
    activeOutageCount: outageCounts,
    unresolvedAnomalyCount: anomalyCounts,
    topPerformers: topHealth.map((h) => ({ site: h.site?.name, score: h.overallScore, grade: h.grade, trend: h.trend })),
    bottomPerformers: bottomHealth.map((h) => ({ site: h.site?.name, score: h.overallScore, grade: h.grade, trend: h.trend })),
  };
}

async function fetchPerformanceData(region?: string, technology?: string) {
  const where = buildWhere(region, technology);

  const [kpiAgg, slaTargets, avgAvailability, avgDropRate, avgLatency] = await Promise.all([
    db.kpiMetric.aggregate({
      _avg: { rsrp: true, rsrq: true, sinr: true, downloadThroughput: true, uploadThroughput: true, availability: true, dropRate: true, latency: true, prbUtilization: true, handoverSuccessRate: true },
      _count: true,
      where,
    }),
    db.sLATarget.findMany({ take: 20 }),
    db.kpiMetric.aggregate({ _avg: { availability: true }, where }),
    db.kpiMetric.aggregate({ _avg: { dropRate: true }, where }),
    db.kpiMetric.aggregate({ _avg: { latency: true }, where }),
  ]);

  const slaCompliant = (avgAvailability._avg.availability ?? 100) >= 99.5;

  return {
    kpiAverages: {
      rsrp: `${fmt(kpiAgg._avg.rsrp)} dBm`,
      rsrq: `${fmt(kpiAgg._avg.rsrq)} dB`,
      sinr: `${fmt(kpiAgg._avg.sinr)} dB`,
      downloadThroughput: `${fmt(kpiAgg._avg.downloadThroughput)} Mbps`,
      uploadThroughput: `${fmt(kpiAgg._avg.uploadThroughput)} Mbps`,
      availability: pct(kpiAgg._avg.availability),
      dropRate: pct(kpiAgg._avg.dropRate),
      latency: `${fmt(kpiAgg._avg.latency)} ms`,
      prbUtilization: pct(kpiAgg._avg.prbUtilization),
      handoverSuccessRate: pct(kpiAgg._avg.handoverSuccessRate),
      totalRecords: kpiAgg._count,
    },
    slaCompliance: {
      overallCompliant: slaCompliant,
      avgAvailability: pct(avgAvailability._avg.availability),
      avgDropRate: pct(avgDropRate._avg.dropRate),
      avgLatency: `${fmt(avgLatency._avg.latency)} ms`,
      slaTargetCount: slaTargets.length,
    },
  };
}

async function fetchCapacityData(region?: string, technology?: string) {
  const where = buildWhere(region, technology);

  const [capacityForecasts, cellLoads, trafficForecasts, subscriberSegments, highRiskCapacity] =
    await Promise.all([
      db.capacityForecast.findMany({ where, take: 30, orderBy: { createdAt: 'desc' } }),
      db.cellLoad.findMany({ where, take: 30, orderBy: { createdAt: 'desc' }, include: { site: { select: { name: true, region: true } } } }),
      db.trafficForecast.findMany({ where, take: 20, orderBy: { createdAt: 'desc' } }),
      db.subscriberSegment.findMany({ take: 20 }),
      db.capacityForecast.findMany({ where: { ...where, riskLevel: { in: ['high', 'critical'] } }, take: 10, include: { site: { select: { name: true, region: true } } } }),
    ]);

  const avgLoad = cellLoads.length > 0
    ? cellLoads.reduce((s, c) => s + c.prbUtilDownlink, 0) / cellLoads.length
    : 0;
  const congestedSites = cellLoads.filter((c) => c.congestionLevel === 'high' || c.congestionLevel === 'critical').length;
  const totalSubscribers = subscriberSegments.reduce((s, seg) => s + seg.subscriberCount, 0);
  const avgGrowthRate = trafficForecasts.length > 0
    ? trafficForecasts.reduce((s, f) => s + f.growthRate, 0) / trafficForecasts.length
    : 0;

  return {
    capacitySummary: {
      totalForecasts: capacityForecasts.length,
      highRiskCount: capacityForecasts.filter((c) => c.riskLevel === 'high' || c.riskLevel === 'critical').length,
      avgGrowthRate: pct(avgGrowthRate),
    },
    cellLoadSummary: {
      totalCellLoads: cellLoads.length,
      avgPrbUtilizationDownlink: pct(avgLoad),
      congestedSiteCount: congestedSites,
      topLoadedCells: cellLoads
        .sort((a, b) => b.prbUtilDownlink - a.prbUtilDownlink)
        .slice(0, 5)
        .map((c) => ({ site: c.site?.name, prbUtilDownlink: pct(c.prbUtilDownlink), congestion: c.congestionLevel })),
    },
    trafficSummary: {
      totalForecasts: trafficForecasts.length,
      avgGrowthRate: pct(avgGrowthRate),
      growingForecasts: trafficForecasts.filter((f) => f.trendDirection === 'growing').length,
    },
    subscriberSummary: {
      totalSubscribers,
      totalSegments: subscriberSegments.length,
      avgArpu: fmt(subscriberSegments.length > 0 ? subscriberSegments.reduce((s, seg) => s + seg.arpu, 0) / subscriberSegments.length : 0, 0),
    },
    highRiskItems: highRiskCapacity.map((c) => ({
      site: c.site?.name,
      region: c.region,
      riskLevel: c.riskLevel,
      growthRate: pct(c.growthRate),
      recommendation: c.recommendation,
    })),
  };
}

async function fetchFinancialData(region?: string, technology?: string) {
  const where = buildWhere(region, technology);

  const [revenueProjections, roiRecords, churnPredictions, wilayaProfiles, commercialInsights] =
    await Promise.all([
      db.revenueProjection.findMany({ take: 20, orderBy: { createdAt: 'desc' } }),
      db.roiRecord.findMany({ take: 20, orderBy: { createdAt: 'desc' } }),
      db.churnPrediction.findMany({ where, take: 20, orderBy: { createdAt: 'desc' } }),
      db.wilayaProfile.findMany({ where: region ? { wilayaName: region } : undefined, take: 20, orderBy: { totalRevenue: 'desc' } }),
      db.networkCommercialInsight.findMany({ where: region ? { region } : undefined, take: 20, orderBy: { totalRevenue: 'desc' } }),
    ]);

  const totalRevenue = wilayaProfiles.reduce((s, w) => s + Number(w.totalRevenue), 0);
  const totalRevenueAtRisk = wilayaProfiles.reduce((s, w) => s + Number(w.revenueAtRisk), 0);
  const avgChurnRate = churnPredictions.length > 0
    ? churnPredictions.reduce((s, c) => s + c.churnRate, 0) / churnPredictions.length
    : 0;
  const increasingChurn = churnPredictions.filter((c) => c.churnTrend === 'increasing').length;
  const avgRoi = roiRecords.length > 0
    ? roiRecords.reduce((s, r) => s + r.roiPercentage, 0) / roiRecords.length
    : 0;
  const avgRevenueGrowth = revenueProjections.length > 0
    ? revenueProjections.reduce((s, r) => s + r.growthRate, 0) / revenueProjections.length
    : 0;

  return {
    revenueSummary: {
      totalWilayaRevenue: totalRevenue,
      totalRevenueAtRisk,
      avgGrowthRate: pct(avgRevenueGrowth),
      totalProjections: revenueProjections.length,
      growingSegments: revenueProjections.filter((r) => r.trendDirection === 'growing').length,
    },
    roiSummary: {
      totalRecords: roiRecords.length,
      avgRoi: pct(avgRoi),
      avgPaybackMonths: fmt(roiRecords.length > 0 ? roiRecords.reduce((s, r) => s + r.paybackMonths, 0) / roiRecords.length : 0, 0),
      totalAnnualSaving: roiRecords.reduce((s, r) => s + r.annualSaving, 0),
      realizedCount: roiRecords.filter((r) => r.status === 'realized').length,
    },
    churnSummary: {
      avgChurnRate: pct(avgChurnRate),
      increasingChurnWilayas: increasingChurn,
      totalPredictions: churnPredictions.length,
      totalRevenueAtRisk: churnPredictions.reduce((s, c) => s + c.revenueAtRisk, 0),
    },
    topRevenueWilayas: wilayaProfiles.slice(0, 5).map((w) => ({
      wilaya: w.wilayaName,
      revenue: Number(w.totalRevenue),
      subscribers: w.totalSubscribers,
      churnRate: pct(w.churnRate),
      arpu: w.avgArpu,
    })),
    commercialInsights: commercialInsights.slice(0, 5).map((c) => ({
      zone: c.zoneName,
      revenue: c.totalRevenue,
      churnRate: pct(c.churnRate),
      networkScore: c.networkScore,
      commercialScore: c.commercialScore,
      revenueLeakage: c.revenueLeakageEst,
    })),
  };
}

async function fetchComprehensiveData(region?: string, technology?: string) {
  const [health, performance, capacity, financial] = await Promise.all([
    fetchNetworkHealthData(region, technology),
    fetchPerformanceData(region, technology),
    fetchCapacityData(region, technology),
    fetchFinancialData(region, technology),
  ]);
  return { networkHealth: health, performance, capacity, financial };
}

// ---------- Data fetcher by type ----------
async function fetchReportData(reportType: ReportType, region?: string, technology?: string) {
  switch (reportType) {
    case 'network_health': return { networkHealth: await fetchNetworkHealthData(region, technology) };
    case 'performance': return { performance: await fetchPerformanceData(region, technology) };
    case 'capacity': return { capacity: await fetchCapacityData(region, technology) };
    case 'financial': return { financial: await fetchFinancialData(region, technology) };
    case 'comprehensive': return await fetchComprehensiveData(region, technology);
  }
}

// ---------- System prompt builder ----------
function buildSystemPrompt(reportType: ReportType, language: Lang): string {
  const langInstructions: Record<Lang, string> = {
    en: 'Write the report in English.',
    fr: 'R\u00e9digez le rapport en fran\u00e7ais.',
    ar: 'اكتب التقرير باللغة العربية. Use Arabic text for all content values (headings, content, metric names, recommendations).',
  };

  const reportFocus: Record<ReportType, string> = {
    network_health: 'Focus on network health scores, alert severity distribution, active outages, anomalies, and top/bottom performing sites.',
    performance: 'Focus on KPI averages (RSRP, RSRQ, SINR, throughput, availability, drop rate, latency, PRB utilization), SLA compliance, and performance trends.',
    capacity: 'Focus on capacity forecasts, cell load distribution, traffic growth trends, subscriber counts, and high-risk capacity items.',
    financial: 'Focus on revenue projections, ROI records, churn predictions, wilaya commercial KPIs, and revenue-at-risk analysis.',
    comprehensive: 'Cover ALL domains: network health, KPI performance, capacity planning, and financial/commercial metrics. Provide a holistic executive overview.',
  };

  return `You are a senior telecom network analyst generating executive reports for NetOptima DZ, a mobile network optimization platform in Algeria.

Context:
- Algeria mobile network operating 2G/3G/4G/5G across 58 wilayas with 77 sites
- ${reportFocus[reportType]}
- ${langInstructions[language]}

IMPORTANT: Keep all JSON keys in English regardless of language. Only translate the VALUES (heading, content, action, name fields) into the requested language.

Your response MUST be valid JSON with this exact structure:
{
  "title": "string - report title in requested language",
  "reportType": "${reportType}",
  "generatedAt": "ISO timestamp",
  "sections": [
    {
      "heading": "string - section heading in requested language",
      "content": "string - detailed paragraph content in requested language with specific numbers from the data",
      "priority": "high" | "medium" | "low"
    }
  ],
  "keyMetrics": [
    {
      "name": "string - metric name in requested language",
      "value": "string - value with unit",
      "trend": "up" | "down" | "stable",
      "unit": "string"
    }
  ],
  "recommendations": [
    {
      "action": "string - action in requested language",
      "priority": "high" | "medium" | "low",
      "impact": "string - impact description in requested language",
      "effort": "string - effort level in requested language"
    }
  ],
  "overallScore": number (0-100),
  "riskLevel": "low" | "medium" | "high" | "critical"
}

Include these sections in order:
1. Executive Summary (priority: high)
2. Key Findings (priority: high) 
3. Critical Issues (priority: high)
4. Recommendations (priority: medium)
5. KPI Highlights (priority: low)

Be specific with ALL numbers from the data. Reference actual values, percentages, and counts. Make the report actionable for C-level executives.`;
}

// ---------- Template helper ----------
async function getOrCreateTemplate(): Promise<string> {
  let template = await db.reportTemplate.findFirst({ where: { name: 'AI Executive Report' } });
  if (!template) {
    template = await db.reportTemplate.create({
      data: {
        name: 'AI Executive Report',
        type: 'executive',
        description: 'AI-generated executive reports with real data analysis',
        isBuiltIn: true,
        config: JSON.stringify({ source: 'ai_executive' }),
      },
    });
  }
  return template.id;
}

// ---------- POST Handler ----------
export async function POST(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 10 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const body = await request.json();
    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { reportType, region, technology, language } = parsed.data;

    // 1. Fetch data from database
    const reportData = await fetchReportData(reportType, region, technology);
    const dataStr = JSON.stringify(reportData, null, 2);

    // 2. Build prompt and call LLM
    const systemPrompt = buildSystemPrompt(reportType, language);
    const zai = await getZai();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: `Generate an executive report based on this network data:\n\n${dataStr}` },
      ],
      thinking: { type: 'disabled' },
    });

    const rawContent = completion.choices?.[0]?.message?.content || '';

    // 3. Parse the LLM JSON response
    let report;
    try {
      // Extract JSON from possible markdown code fences
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawContent];
      report = JSON.parse(jsonMatch[1] || rawContent);
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI-generated report' }, { status: 500 });
    }

    // Ensure required fields
    report.reportType = reportType;
    report.generatedAt = report.generatedAt || new Date().toISOString();

    // 4. Save GeneratedReport record
    const templateId = await getOrCreateTemplate();
    await db.generatedReport.create({
      data: {
        templateId,
        name: report.title || `${reportType} Report`,
        type: reportType,
        format: 'json',
        status: 'completed',
        generatedBy: 'ai_executive',
      },
    });

    // 5. Return the complete report
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
