import { z } from 'zod';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { checkApiAuth, authError, forbiddenError } from '@/lib/api-auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getTemplateById } from '@/lib/report-templates';

const generateSchema = z.object({
  templateId: z.string().min(1),
  format: z.enum(['pdf', 'xlsx', 'both']),
});

// ────────────────────────────────────────────
// Helper: avg of numeric array
// ────────────────────────────────────────────
function avg(values: (number | null | undefined)[]): number {
  const nums = values.filter((v): v is number => v != null && !isNaN(v));
  return nums.length > 0 ? Number((nums.reduce((s, v) => s + v, 0) / nums.length).toFixed(2)) : 0;
}

// ────────────────────────────────────────────
// Data fetchers per type
// ────────────────────────────────────────────
async function fetchKpiData(): Promise<Record<string, unknown>> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const kpis = await db.kpiMetric.findMany({
    where: { timestamp: { gte: since } },
    select: {
      technology: true,
      downloadThroughput: true,
      uploadThroughput: true,
      latency: true,
      availability: true,
      prbUtilization: true,
      rssi: true,
      rsrp: true,
      rsrq: true,
      sinr: true,
      handoverSuccessRate: true,
      dropRate: true,
      activeUsers: true,
      jitter: true,
      packetLoss: true,
    },
    take: 1000,
  });

  // Group by technology
  const byTech: Record<string, typeof kpis> = {};
  for (const k of kpis) {
    if (!byTech[k.technology]) byTech[k.technology] = [];
    byTech[k.technology].push(k);
  }

  const byTechnology = Object.entries(byTech)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tech, items]) => ({
      technology: tech,
      dataPoints: items.length,
      avgDownload: avg(items.map((k) => k.downloadThroughput)),
      maxDownload: Math.max(...items.map((k) => k.downloadThroughput ?? 0)),
      minDownload: items.some((k) => k.downloadThroughput != null) ? Math.min(...items.map((k) => k.downloadThroughput ?? Infinity)) : 0,
      avgUpload: avg(items.map((k) => k.uploadThroughput)),
      avgLatency: avg(items.map((k) => k.latency)),
      maxLatency: Math.max(...items.map((k) => k.latency ?? 0)),
      p95Latency: percentile95(items.map((k) => k.latency)),
      avgAvailability: avg(items.map((k) => k.availability)),
      minAvailability: Math.min(...items.map((k) => k.availability ?? 100)),
      avgPrbUtil: avg(items.map((k) => k.prbUtilization)),
      maxPrbUtil: Math.max(...items.map((k) => k.prbUtilization ?? 0)),
      avgRsrp: avg(items.map((k) => k.rsrp)),
      avgRsrq: avg(items.map((k) => k.rsrq)),
      avgSinr: avg(items.map((k) => k.sinr)),
    }));

  return {
    period: { from: since.toISOString(), to: new Date().toISOString(), label: '24 hours' },
    technologies: byTechnology,
    totalDataPoints: kpis.length,
  };
}

function percentile95(values: (number | null | undefined)[]): number {
  const nums = values
    .filter((v): v is number => v != null && !isNaN(v))
    .sort((a, b) => a - b);
  if (nums.length === 0) return 0;
  const idx = Math.ceil(nums.length * 0.95) - 1;
  return Number(nums[Math.max(0, idx)].toFixed(2));
}

async function fetchSonData(): Promise<Record<string, unknown>> {
  const modules = await db.sonModule.findMany({
    include: {
      actions: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
    take: 50,
  });

  const totalActions = modules.reduce((s, m) => s + m.actions.length, 0);
  const totalApplied = modules.reduce(
    (s, m) => s + m.actions.filter((a) => a.status === 'applied').length,
    0,
  );

  const moduleSummaries = modules.map((mod) => {
    const applied = mod.actions.filter((a) => a.status === 'applied').length;
    const failed = mod.actions.filter((a) => a.status === 'failed').length;
    return {
      name: mod.name,
      displayName: mod.displayName,
      technology: mod.technology,
      enabled: mod.enabled,
      mode: mod.mode,
      actionCount: mod.actions.length,
      successRate: mod.actions.length > 0 ? Number(((applied / mod.actions.length) * 100).toFixed(1)) : 0,
      recentActions: mod.actions.slice(0, 10).map((a) => ({
        actionType: a.actionType,
        parameter: a.parameter,
        previousValue: a.previousValue,
        newValue: a.newValue,
        status: a.status,
        impactScore: a.impactScore,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    totalModules: modules.length,
    enabledModules: modules.filter((m) => m.enabled).length,
    totalActions,
    successRate: totalActions > 0 ? Number(((totalApplied / totalActions) * 100).toFixed(1)) : 0,
    modules: moduleSummaries,
  };
}

async function fetchPolicyData(): Promise<Record<string, unknown>> {
  const [policies, executionCount] = await Promise.all([
    db.policy.findMany({ take: 100 }),
    db.policyExecution.count(),
  ]);

  const enabledCount = policies.filter((p) => p.enabled).length;

  // Count successes
  const successCount = await db.policyExecution.count({ where: { status: 'completed' } });

  return {
    generatedAt: new Date().toISOString(),
    totalPolicies: policies.length,
    enabledPolicies: enabledCount,
    disabledPolicies: policies.length - enabledCount,
    totalExecutions: executionCount,
    successRate: executionCount > 0 ? Number(((successCount / executionCount) * 100).toFixed(1)) : 0,
    policies: policies.map((p) => ({
      id: p.id,
      name: p.name,
      technology: p.technology,
      triggerType: p.triggerType,
      priority: p.priority,
      enabled: p.enabled,
      createdAt: p.createdAt.toISOString(),
    })),
  };
}

async function fetchSlaData(): Promise<Record<string, unknown>> {
  const targets = await db.sLATarget.findMany({ where: { enabled: true }, take: 50 });

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

  const avgMap: Record<string, Record<string, number>> = {};
  for (const t of techAvgs) {
    avgMap[t.technology] = {
      availability: t._avg.availability ?? 0,
      dropRate: t._avg.dropRate ?? 0,
      latency: t._avg.latency ?? 0,
      handoverSuccessRate: t._avg.handoverSuccessRate ?? 0,
      prbUtilization: t._avg.prbUtilization ?? 0,
      downloadThroughput: t._avg.downloadThroughput ?? 0,
    };
  }

  const items = targets.map((t) => {
    const actualValue = Number((avgMap[t.technology]?.[t.metric] ?? 0).toFixed(2));
    let compliant: boolean;
    if (t.condition === 'gte') {
      compliant = actualValue >= t.targetValue;
    } else {
      compliant = actualValue <= t.targetValue;
    }
    return {
      technology: t.technology,
      metric: t.metric,
      targetValue: t.targetValue,
      actualValue,
      condition: t.condition,
      compliant,
      severity: t.severity,
    };
  });

  const compliantCount = items.filter((i) => i.compliant).length;

  return {
    generatedAt: new Date().toISOString(),
    totalTargets: targets.length,
    compliantCount,
    breachCount: targets.length - compliantCount,
    complianceRate: targets.length > 0 ? Number(((compliantCount / targets.length) * 100).toFixed(1)) : 100,
    targets: items,
  };
}

async function fetchQoeData(): Promise<Record<string, unknown>> {
  const qoeData = await db.qoEMetric.findMany({
    include: { site: { select: { region: true, technology: true, name: true, code: true } } },
    orderBy: { timestamp: 'desc' },
    take: 500,
  });

  // Latest per site
  const latestBySite = new Map<string, (typeof qoeData)[0]>();
  for (const q of qoeData) {
    if (!latestBySite.has(q.siteId)) latestBySite.set(q.siteId, q);
  }
  const latest = Array.from(latestBySite.values());

  const byTechnology = Object.entries(
    latest.reduce<Record<string, typeof latest>>((acc, m) => {
      if (!acc[m.technology]) acc[m.technology] = [];
      acc[m.technology].push(m);
      return acc;
    }, {}),
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tech, items]) => ({
      technology: tech,
      siteCount: items.length,
      avgMosScore: avg(items.map((i) => i.mosScore)),
      avgDataRate: avg(items.map((i) => i.dataRateExperienced)),
      avgCallSetupTime: avg(items.map((i) => i.callSetupTime)),
      avgCallDropRate: avg(items.map((i) => i.callDropRate)),
    }));

  return {
    generatedAt: new Date().toISOString(),
    sampleCount: latest.length,
    avgMosScore: avg(latest.map((i) => i.mosScore)),
    avgDataRate: avg(latest.map((i) => i.dataRateExperienced)),
    avgCallSetupTime: avg(latest.map((i) => i.callSetupTime)),
    avgCallDropRate: avg(latest.map((i) => i.callDropRate)),
    byTechnology,
  };
}

async function fetchCoverageData(): Promise<Record<string, unknown>> {
  const sites = await db.networkSite.findMany({
    select: { id: true, name: true, code: true, technology: true, region: true, status: true, latitude: true, longitude: true },
    take: 500,
  });

  const byRegion = sites.reduce<Record<string, { total: number; active: number; techs: Set<string> }>>((acc, s) => {
    if (!acc[s.region]) acc[s.region] = { total: 0, active: 0, techs: new Set() };
    acc[s.region].total++;
    if (s.status === 'active') acc[s.region].active++;
    acc[s.region].techs.add(s.technology);
    return acc;
  }, {});

  const regions = Object.entries(byRegion)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([region, data]) => ({
      region,
      totalSites: data.total,
      activeSites: data.active,
      technologies: Array.from(data.techs).sort(),
    }));

  const byTech = sites.reduce<Record<string, number>>((acc, s) => {
    acc[s.technology] = (acc[s.technology] ?? 0) + 1;
    return acc;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    totalSites: sites.length,
    activeSites: sites.filter((s) => s.status === 'active').length,
    regionCount: regions.length,
    regions,
    byTechnology: Object.entries(byTech)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tech, count]) => ({ technology: tech, count })),
  };
}

async function fetchExecutiveData(): Promise<Record<string, unknown>> {
  const [siteCount, alertCount, incidentCount, avgHealth, sites] = await Promise.all([
    db.networkSite.count(),
    db.alert.count({ where: { acknowledged: false, resolvedAt: null } }),
    db.incident.count({ where: { status: { in: ['open', 'investigating'] } } }),
    db.healthScore.aggregate({ _avg: { overallScore: true } }),
    db.networkSite.findMany({ select: { status: true }, take: 500 }),
  ]);

  const healthy = sites.filter((s) => s.status === 'active').length;
  const degraded = sites.filter((s) => s.status === 'degraded').length;
  const critical = sites.filter((s) => s.status === 'critical').length;
  const overallAvailability = sites.length > 0 ? Number(((healthy / sites.length) * 100).toFixed(1)) : 100;

  return {
    generatedAt: new Date().toISOString(),
    totalSites: siteCount,
    activeAlerts: alertCount,
    openIncidents: incidentCount,
    avgHealthScore: Number((avgHealth._avg.overallScore ?? 0).toFixed(1)),
    healthySites: healthy,
    degradedSites: degraded,
    criticalSites: critical,
    overallAvailability,
  };
}

// ────────────────────────────────────────────
// POST — Generate a report from template
// ────────────────────────────────────────────
export async function POST(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 20 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const user = await checkApiAuth(request);
    const perms = (user.permissions as string[]) ?? [];
    const canCreate = perms.includes('*:*') || perms.includes('reports:*') || perms.includes('reports:create');
    if (!canCreate) return forbiddenError();
  } catch (e: any) {
    if (e.message === 'UNAUTHENTICATED') return authError();
    if (e.message === 'FORBIDDEN') return forbiddenError();
    return authError();
  }

  try {
    const body = await request.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { templateId, format } = parsed.data;
    const user = await checkApiAuth(request);

    // 1. Find template — built-in or DB
    let templateName = '';
    let templateType = '';
    let dbTemplateId = templateId;

    const dbTemplate = await db.reportTemplate.findUnique({ where: { id: templateId } });
    if (dbTemplate) {
      templateName = dbTemplate.name;
      templateType = dbTemplate.type;
    } else {
      // Check built-in templates
      const builtIn = getTemplateById(templateId);
      if (!builtIn) {
        return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 });
      }
      templateName = builtIn.name;
      templateType = builtIn.type;

      // Auto-create a DB record for the built-in template so we can reference it
      const created = await db.reportTemplate.create({
        data: {
          name: builtIn.name,
          description: builtIn.description,
          type: builtIn.type,
          technology: builtIn.technology ?? null,
          config: JSON.stringify({ sections: builtIn.sections }),
          isBuiltIn: true,
        },
      });
      dbTemplateId = created.id;
    }

    // 2. Fetch data based on template type
    let data: Record<string, unknown>;
    switch (templateType) {
      case 'kpi':
        data = await fetchKpiData();
        break;
      case 'son':
        data = await fetchSonData();
        break;
      case 'policy':
        data = await fetchPolicyData();
        break;
      case 'sla':
        data = await fetchSlaData();
        break;
      case 'qoe':
        data = await fetchQoeData();
        break;
      case 'coverage':
        data = await fetchCoverageData();
        break;
      case 'executive':
        data = await fetchExecutiveData();
        break;
      default:
        data = { message: 'Aucune donnée disponible pour ce type de modèle personnalisé' };
    }

    // 3. Record the generation in GeneratedReport table
    const report = await db.generatedReport.create({
      data: {
        templateId: dbTemplateId,
        name: `${templateName} — ${new Date().toISOString().split('T')[0]}`,
        type: templateType,
        format,
        fileSizeBytes: 0, // Will be updated by client after actual PDF generation
        status: 'completed',
        generatedBy: user.id as string,
      },
    });

    // 4. Return data for client-side PDF generation
    return NextResponse.json({
      reportId: report.id,
      templateName,
      type: templateType,
      data,
      format,
      generatedAt: report.createdAt.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
