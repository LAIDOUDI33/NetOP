import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkApiAuth, authError } from '@/lib/api-auth';

// ── Statistics helpers ──
function stats(values: number[]) {
  if (values.length === 0) return { avg: 0, min: 0, max: 0, stddev: 0, count: 0 };
  const n = values.length;
  const sum = values.reduce((s, v) => s + v, 0);
  const avg = sum / n;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / (n > 1 ? n - 1 : 1);
  const stddev = Math.sqrt(variance);
  return {
    avg: Number(avg.toFixed(2)),
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    stddev: Number(stddev.toFixed(2)),
    count: n,
  };
}

function extractField(items: any[], field: string): number[] {
  return items
    .map((i) => i[field])
    .filter((v): v is number => typeof v === 'number' && !isNaN(v));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const _auth = await checkApiAuth(request);
  if (!_auth) return authError();
  const type = searchParams.get('type') || 'daily';
  const technology = searchParams.get('technology');

  try {
    const now = new Date();
    const since =
      type === 'weekly'
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const techFilter = technology && technology !== 'all' ? technology : undefined;

    switch (type) {
      case 'daily':
      case 'weekly':
        return handleKpiReport(since, now, techFilter, type);
      case 'sla':
        return handleSlaReport(techFilter);
      case 'son':
        return handleSonReport(techFilter);
      case 'qoe':
        return handleQoeReport(techFilter, since, now);
      default:
        return NextResponse.json({ error: `Unknown report type: ${type}` }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ────────────────────────────────────────────
// DAILY / WEEKLY: KPI summary by technology
// ────────────────────────────────────────────
async function handleKpiReport(
  since: Date,
  now: Date,
  techFilter: string | undefined,
  period: string,
) {
  const where: Record<string, any> = { timestamp: { gte: since } };
  if (techFilter) where.technology = techFilter;

  const kpis = await db.kpiMetric.findMany({
    where,
    select: {
      technology: true,
      rssi: true,
      rsrp: true,
      rsrq: true,
      sinr: true,
      downloadThroughput: true,
      uploadThroughput: true,
      latency: true,
      jitter: true,
      packetLoss: true,
      availability: true,
      activeUsers: true,
      handoverSuccessRate: true,
      dropRate: true,
      prbUtilization: true,
    },
  });

  const metricFields = [
    'rssi', 'rsrp', 'rsrq', 'sinr',
    'downloadThroughput', 'uploadThroughput',
    'latency', 'jitter', 'packetLoss',
    'availability', 'activeUsers', 'handoverSuccessRate',
    'dropRate', 'prbUtilization',
  ];

  // Group by technology
  const byTech: Record<string, typeof kpis> = {};
  for (const k of kpis) {
    if (!byTech[k.technology]) byTech[k.technology] = [];
    byTech[k.technology].push(k);
  }

  const technologies = Object.keys(byTech).sort();
  const results: Record<string, Record<string, ReturnType<typeof stats>>> = {};

  for (const tech of technologies) {
    results[tech] = {};
    for (const field of metricFields) {
      results[tech][field] = stats(extractField(byTech[tech], field));
    }
  }

  return NextResponse.json({
    type: period,
    period: {
      from: since.toISOString(),
      to: now.toISOString(),
      label: period === 'weekly' ? '7 days' : '24 hours',
    },
    technologies,
    metrics: results,
    totalDataPoints: kpis.length,
  });
}

// ────────────────────────────────────────────
// SLA: compliance per technology with breaches
// ────────────────────────────────────────────
async function handleSlaReport(techFilter: string | undefined) {
  const targetWhere: Record<string, any> = { enabled: true };
  if (techFilter) targetWhere.technology = techFilter;

  const targets = await db.sLATarget.findMany({ where: targetWhere });
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const techAvgs = await db.kpiMetric.groupBy({
    by: ['technology'],
    where: { timestamp: { gte: oneHourAgo } },
    _avg: {
      availability: true,
      dropRate: true,
      latency: true,
      handoverSuccessRate: true,
      prbUtilization: true,
      downloadThroughput: true,
    },
  });

  const avgMap: Record<string, any> = {};
  for (const t of techAvgs) {
    avgMap[t.technology] = t._avg;
  }

  const breaches: any[] = [];
  const complianceByTech: Record<string, { total: number; compliant: number; breached: number; rate: number }> = {};

  for (const t of targets) {
    const avg =
      avgMap[t.technology]?._avg?.[t.metric] ??
      avgMap[t.technology]?.[t.metric] ??
      0;
    const actualValue = Number((avg as number).toFixed(2));

    let compliant: boolean;
    let breachPercent = 0;

    if (t.condition === 'gte') {
      compliant = actualValue >= t.targetValue;
      breachPercent = compliant
        ? 0
        : Number((((t.targetValue - actualValue) / t.targetValue) * 100).toFixed(1));
    } else {
      compliant = actualValue <= t.targetValue;
      breachPercent = compliant
        ? 0
        : Number((((actualValue - t.targetValue) / t.targetValue) * 100).toFixed(1));
    }

    if (!compliant) {
      breaches.push({
        technology: t.technology,
        metric: t.metric,
        targetValue: t.targetValue,
        condition: t.condition,
        actualValue,
        breachPercent,
        severity: t.severity,
      });
    }

    // Aggregate by technology
    if (!complianceByTech[t.technology]) {
      complianceByTech[t.technology] = { total: 0, compliant: 0, breached: 0, rate: 0 };
    }
    complianceByTech[t.technology].total++;
    if (compliant) complianceByTech[t.technology].compliant++;
    else complianceByTech[t.technology].breached++;
  }

  // Compute rates
  for (const tech of Object.keys(complianceByTech)) {
    const c = complianceByTech[tech];
    c.rate = c.total > 0 ? Number(((c.compliant / c.total) * 100).toFixed(1)) : 0;
  }

  return NextResponse.json({
    type: 'sla',
    generatedAt: new Date().toISOString(),
    complianceByTech,
    totalTargets: targets.length,
    totalBreaches: breaches.length,
    breaches,
  });
}

// ────────────────────────────────────────────
// SON: module execution summary
// ────────────────────────────────────────────
async function handleSonReport(techFilter: string | undefined) {
  const moduleWhere: Record<string, any> = {};
  if (techFilter && techFilter !== 'ALL') moduleWhere.technology = techFilter;

  const modules = await db.sonModule.findMany({
    where: moduleWhere,
    include: {
      actions: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  });

  const moduleSummaries = modules.map((mod) => {
    const actions = mod.actions;
    const totalActions = actions.length;
    const applied = actions.filter((a) => a.status === 'applied').length;
    const failed = actions.filter((a) => a.status === 'failed').length;
    const rolledBack = actions.filter((a) => a.status === 'rolled_back').length;
    const pending = actions.filter((a) => a.status === 'pending').length;
    const successRate =
      totalActions > 0 ? Number(((applied / totalActions) * 100).toFixed(1)) : 0;

    // Parse stats JSON
    let parsedStats: any = {};
    try {
      parsedStats = typeof mod.stats === 'string' ? JSON.parse(mod.stats) : mod.stats;
    } catch {}

    // Compute average impact score
    const impactScores = actions
      .map((a) => a.impactScore)
      .filter((v): v is number => v != null && !isNaN(v));
    const avgImpact =
      impactScores.length > 0
        ? Number((impactScores.reduce((s, v) => s + v, 0) / impactScores.length).toFixed(2))
        : null;

    // Recent actions for detail
    const recentActions = actions.slice(0, 10).map((a) => ({
      id: a.id,
      actionType: a.actionType,
      parameter: a.parameter,
      previousValue: a.previousValue,
      newValue: a.newValue,
      reason: a.reason,
      status: a.status,
      impactScore: a.impactScore,
      siteId: a.siteId,
      createdAt: a.createdAt.toISOString(),
      appliedAt: a.appliedAt?.toISOString() ?? null,
    }));

    return {
      moduleId: mod.id,
      name: mod.name,
      displayName: mod.displayName,
      technology: mod.technology,
      mode: mod.mode,
      enabled: mod.enabled,
      totalActions,
      applied,
      failed,
      rolledBack,
      pending,
      successRate,
      avgImpact,
      stats: parsedStats,
      recentActions,
    };
  });

  // Aggregate totals
  const totals = {
    modules: modules.length,
    enabledModules: modules.filter((m) => m.enabled).length,
    totalActions: modules.reduce((s, m) => s + m.actions.length, 0),
    totalApplied: modules.reduce(
      (s, m) => s + m.actions.filter((a) => a.status === 'applied').length,
      0,
    ),
    totalFailed: modules.reduce(
      (s, m) => s + m.actions.filter((a) => a.status === 'failed').length,
      0,
    ),
  } as Record<string, number>;
  const overallSuccessRate =
    totals.totalActions > 0
      ? Number(((totals.totalApplied / totals.totalActions) * 100).toFixed(1))
      : 0;

  return NextResponse.json({
    type: 'son',
    generatedAt: new Date().toISOString(),
    summary: {
      ...totals,
      overallSuccessRate,
    },
    modules: moduleSummaries,
  });
}

// ────────────────────────────────────────────
// QOE: summary per region and technology
// ────────────────────────────────────────────
async function handleQoeReport(
  techFilter: string | undefined,
  since: Date,
  now: Date,
) {
  const where: Record<string, any> = { timestamp: { gte: since } };
  if (techFilter) where.technology = techFilter;

  const qoeData = await db.qoEMetric.findMany({
    where,
    include: {
      site: { select: { region: true, technology: true, name: true, code: true } },
    },
    orderBy: { timestamp: 'desc' },
  });

  // Latest metric per site
  const latestBySite = new Map<string, (typeof qoeData)[0]>();
  for (const q of qoeData) {
    if (!latestBySite.has(q.siteId)) {
      latestBySite.set(q.siteId, q);
    }
  }
  const latestMetrics = Array.from(latestBySite.values());

  // Aggregate by technology
  const byTech: Record<
    string,
    {
      sites: number;
      mos: number[];
      satisfaction: number[];
      complaints: number;
      subscribers: number;
    }
  > = {};

  for (const m of latestMetrics) {
    const tech = m.technology;
    if (!byTech[tech]) byTech[tech] = { sites: 0, mos: [], satisfaction: [], complaints: 0, subscribers: 0 };
    byTech[tech].sites++;
    if (m.mosScore != null) byTech[tech].mos.push(m.mosScore);
    if (m.satisfactionIndex != null) byTech[tech].satisfaction.push(m.satisfactionIndex);
    byTech[tech].complaints += m.complaintCount;
    byTech[tech].subscribers += m.subscriberCount ?? 0;
  }

  const byTechnology = Object.entries(byTech)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tech, data]) => ({
      technology: tech,
      siteCount: data.sites,
      avgMos:
        data.mos.length > 0
          ? Number((data.mos.reduce((s, v) => s + v, 0) / data.mos.length).toFixed(2))
          : null,
      avgSatisfaction:
        data.satisfaction.length > 0
          ? Number(
              (data.satisfaction.reduce((s, v) => s + v, 0) / data.satisfaction.length).toFixed(2),
            )
          : null,
      totalComplaints: data.complaints,
      totalSubscribers: data.subscribers,
      complaintsPer100Subs:
        data.subscribers > 0
          ? Number(((data.complaints / data.subscribers) * 100).toFixed(2))
          : 0,
    }));

  // Aggregate by region
  const byRegion: Record<
    string,
    {
      sites: number;
      mos: number[];
      satisfaction: number[];
      complaints: number;
      subscribers: number;
      technologies: Set<string>;
    }
  > = {};

  for (const m of latestMetrics) {
    const region = m.site?.region ?? 'Unknown';
    if (!byRegion[region])
      byRegion[region] = {
        sites: 0,
        mos: [],
        satisfaction: [],
        complaints: 0,
        subscribers: 0,
        technologies: new Set(),
      };
    byRegion[region].sites++;
    if (m.mosScore != null) byRegion[region].mos.push(m.mosScore);
    if (m.satisfactionIndex != null) byRegion[region].satisfaction.push(m.satisfactionIndex);
    byRegion[region].complaints += m.complaintCount;
    byRegion[region].subscribers += m.subscriberCount ?? 0;
    byRegion[region].technologies.add(m.technology);
  }

  const byRegionArr = Object.entries(byRegion)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([region, data]) => ({
      region,
      siteCount: data.sites,
      technologies: Array.from(data.technologies).sort(),
      avgMos:
        data.mos.length > 0
          ? Number((data.mos.reduce((s, v) => s + v, 0) / data.mos.length).toFixed(2))
          : null,
      avgSatisfaction:
        data.satisfaction.length > 0
          ? Number(
              (data.satisfaction.reduce((s, v) => s + v, 0) / data.satisfaction.length).toFixed(2),
            )
          : null,
      totalComplaints: data.complaints,
      totalSubscribers: data.subscribers,
      complaintsPer100Subs:
        data.subscribers > 0
          ? Number(((data.complaints / data.subscribers) * 100).toFixed(2))
          : 0,
    }));

  return NextResponse.json({
    type: 'qoe',
    generatedAt: now.toISOString(),
    period: { from: since.toISOString(), to: now.toISOString() },
    byTechnology,
    byRegion: byRegionArr,
    totalMetrics: qoeData.length,
    uniqueSites: latestBySite.size,
  });
}

// ────────────────────────────────────────────
// POST: Create a report metadata record
// ────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
  const _auth = await checkApiAuth(request);
  if (!_auth) return authError();
    const body = await request.json();
    const { type, format, name, description, filters } = body;

    if (!type || !['daily', 'weekly', 'sla', 'son', 'qoe'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid or missing report type. Must be: daily, weekly, sla, son, qoe' },
        { status: 400 },
      );
    }

    const reportId = `RPT-${Date.now().toString(36).toUpperCase()}`;
    const now = new Date();

    // Return report metadata — the actual PDF/CSV is generated client-side
    return NextResponse.json({
      id: reportId,
      name:
        name ??
        `${type.charAt(0).toUpperCase() + type.slice(1)} Report — ${now.toISOString().split('T')[0]}`,
      type,
      format: format ?? 'json',
      description: description ?? `Auto-generated ${type} report`,
      filters: filters ?? {},
      status: 'ready',
      downloadUrl: `/api/reports?type=${type}&format=${format || 'json'}`,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}