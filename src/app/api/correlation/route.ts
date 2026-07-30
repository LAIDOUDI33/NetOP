import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { demoHoursAgo, getDemoNow } from '@/lib/demo-time';

// ── Pearson correlation coefficient ──
function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  if (den === 0) return 0;
  return Number((num / den).toFixed(4));
}

export async function GET(request: NextRequest) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'kpi';
  const technology = searchParams.get('technology');
  const now = await getDemoNow();
  const sixHoursAgo = await demoHoursAgo(6);

  try {
    if (type === 'alarm') {
      return handleAlarmCorrelation(technology, sixHoursAgo, now);
    }
    return handleKpiCorrelation(technology, sixHoursAgo, now);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ────────────────────────────────────────────
// ALARM CORRELATION: group alerts within 5 min
// on the same site or region
// ────────────────────────────────────────────
async function handleAlarmCorrelation(
  technology: string | null,
  since: Date,
  now: Date,
) {
  const where: Record<string, any> = {
    createdAt: { gte: since },
    resolvedAt: null,
  };
  if (technology && technology !== 'all') where.technology = technology;

  const alerts = await db.alert.findMany({
    where,
    include: {
      site: { select: { id: true, name: true, code: true, region: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 500,
  });

  // Correlation window: 5 minutes
  const WINDOW_MS = 5 * 60 * 1000;
  const assigned = new Set<string>();
  const groups: Array<{
    id: string;
    severity: string;
    technology: string;
    siteId: string | null;
    siteName: string | null;
    region: string | null;
    alertCount: number;
    startAt: string;
    endAt: string;
    alerts: any[];
  }> = [];

  // Sort alerts by time for sequential scanning
  const sorted = [...alerts].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  let groupId = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (assigned.has(sorted[i].id)) continue;

    groupId++;
    const gid = `CG-${String(groupId).padStart(3, '0')}`;
    const groupAlerts = [sorted[i]];
    assigned.add(sorted[i].id);
    const anchorSiteId = sorted[i].siteId;
    const anchorRegion = sorted[i].site?.region;

    // Look for subsequent alerts within the 5-min window on same site or region
    for (let j = i + 1; j < sorted.length; j++) {
      if (assigned.has(sorted[j].id)) continue;
      const timeDiff = sorted[j].createdAt.getTime() - sorted[i].createdAt.getTime();
      if (timeDiff > WINDOW_MS) break; // past the window, no need to check further

      const sameSite = sorted[j].siteId === anchorSiteId && anchorSiteId != null;
      const sameRegion =
        sorted[j].site?.region === anchorRegion && anchorRegion != null;

      if (sameSite || sameRegion) {
        groupAlerts.push(sorted[j]);
        assigned.add(sorted[j].id);
      }
    }

    // Determine group severity: take the worst
    const severityOrder = ['critical', 'major', 'warning', 'info', 'minor'];
    const severities = groupAlerts.map((a) => a.severity);
    let groupSeverity = 'info';
    for (const sev of severityOrder) {
      if (severities.includes(sev)) {
        groupSeverity = sev;
        break;
      }
    }

    groups.push({
      id: gid,
      severity: groupSeverity,
      technology: groupAlerts[0].technology,
      siteId: groupAlerts[0].siteId,
      siteName: groupAlerts[0].site?.name ?? null,
      region: groupAlerts[0].site?.region ?? null,
      alertCount: groupAlerts.length,
      startAt: groupAlerts[0].createdAt.toISOString(),
      endAt: groupAlerts[groupAlerts.length - 1].createdAt.toISOString(),
      alerts: groupAlerts.map((a) => ({
        id: a.id,
        siteName: a.site?.name,
        siteCode: a.site?.code,
        technology: a.technology,
        metric: a.metric,
        value: a.value,
        severity: a.severity,
        message: a.message,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  }

  // Persist correlatedGroupId back to alerts (best-effort, don't block response)
  const updatePromises = groups.map((g) =>
    db.alert.updateMany({
      where: { id: { in: g.alerts.map((a) => a.id) } },
      data: { correlatedGroupId: g.id },
    }),
  );
  await Promise.all(updatePromises).catch(() => {});

  // Summary
  const totalGrouped = alerts.length - groups.filter((g) => g.alertCount === 1).length;
  const multiAlertGroups = groups.filter((g) => g.alertCount > 1);

  return NextResponse.json({
    type: 'alarm',
    from: since.toISOString(),
    to: now.toISOString(),
    summary: {
      totalAlerts: alerts.length,
      correlationGroups: groups.length,
      multiAlertGroups: multiAlertGroups.length,
      totalGroupedAlerts: totalGrouped,
      bySeverity: {
        critical: multiAlertGroups.filter((g) => g.severity === 'critical').length,
        major: multiAlertGroups.filter((g) => g.severity === 'major').length,
        warning: multiAlertGroups.filter((g) => g.severity === 'warning').length,
        info: multiAlertGroups.filter((g) => g.severity === 'info').length,
      },
    },
    groups,
  });
}

// ────────────────────────────────────────────
// KPI CROSS-CORRELATION: Pearson between
// KPI pairs per technology — last 6h
// ────────────────────────────────────────────
async function handleKpiCorrelation(
  technology: string | null,
  since: Date,
  now: Date,
) {
  const where: Record<string, any> = { timestamp: { gte: since } };
  if (technology && technology !== 'all') where.technology = technology;

  // Fetch all KPI fields needed for correlation pairs
  const kpis = await db.kpiMetric.findMany({
    where,
    orderBy: { timestamp: 'asc' },
    select: {
      technology: true,
      siteId: true,
      timestamp: true,
      rsrp: true,
      downloadThroughput: true,
      sinr: true,
      dropRate: true,
      activeUsers: true,
      prbUtilization: true,
    },
    take: 500,
  });

  // Define correlation pairs: [label, fieldA, fieldB]
  const pairs: Array<{ label: string; fieldA: string; fieldB: string }> = [
    { label: 'RSRP vs Throughput', fieldA: 'rsrp', fieldB: 'downloadThroughput' },
    { label: 'SINR vs Drop Rate', fieldA: 'sinr', fieldB: 'dropRate' },
    { label: 'Users vs PRB Utilization', fieldA: 'activeUsers', fieldB: 'prbUtilization' },
  ];

  // Group by technology
  const byTech: Record<string, typeof kpis> = {};
  for (const k of kpis) {
    if (!byTech[k.technology]) byTech[k.technology] = [];
    byTech[k.technology].push(k);
  }

  // Compute correlation matrix data per technology
  const techResults: Record<
    string,
    {
      technology: string;
      sampleCount: number;
      pairs: Array<{
        label: string;
        fieldA: string;
        fieldB: string;
        coefficient: number;
        interpretation: string;
        dataPoints: number;
      }>;
    }
  > = {};

  function interpretCorrelation(r: number): string {
    const abs = Math.abs(r);
    if (abs >= 0.9) return r > 0 ? 'Very strong positive' : 'Very strong negative';
    if (abs >= 0.7) return r > 0 ? 'Strong positive' : 'Strong negative';
    if (abs >= 0.5) return r > 0 ? 'Moderate positive' : 'Moderate negative';
    if (abs >= 0.3) return r > 0 ? 'Weak positive' : 'Weak negative';
    return 'Negligible';
  }

  for (const [tech, items] of Object.entries(byTech)) {
    const pairResults = pairs.map(({ label, fieldA, fieldB }) => {
      // Build aligned arrays — only use records where both fields are non-null
      const xs: number[] = [];
      const ys: number[] = [];
      for (const item of items) {
        const a = item[fieldA as keyof typeof item];
        const b = item[fieldB as keyof typeof item];
        if (typeof a === 'number' && typeof b === 'number' && !isNaN(a) && !isNaN(b)) {
          xs.push(a);
          ys.push(b);
        }
      }
      const r = pearson(xs, ys);
      return {
        label,
        fieldA,
        fieldB,
        coefficient: r,
        interpretation: interpretCorrelation(r),
        dataPoints: xs.length,
      };
    });

    techResults[tech] = {
      technology: tech,
      sampleCount: items.length,
      pairs: pairResults,
    };
  }

  // Build heatmap-ready matrix rows
  // Labels (rows) = pair labels, columns = technologies
  const techs = Object.keys(techResults).sort();
  const labels = pairs.map((p) => p.label);

  const heatmapMatrix: Array<{
    row: string;
    data: Array<{ technology: string; value: number; interpretation: string }>;
  }> = labels.map((label) => ({
    row: label,
    data: techs.map((tech) => {
      const pair = techResults[tech].pairs.find((p) => p.label === label);
      return {
        technology: tech,
        value: pair?.coefficient ?? 0,
        interpretation: pair?.interpretation ?? 'No data',
      };
    }),
  }));

  // Full correlation grid for all 6 KPI fields
  const allFields = ['rsrp', 'downloadThroughput', 'sinr', 'dropRate', 'activeUsers', 'prbUtilization'];
  const fullMatrix: Array<{
    fieldA: string;
    correlations: Array<{ fieldB: string; coefficient: number; dataPoints: number }>;
  }> = [];

  for (const fieldA of allFields) {
    const row: typeof fullMatrix[0] = { fieldA, correlations: [] };
    for (const fieldB of allFields) {
      if (fieldA === fieldB) {
        row.correlations.push({ fieldB, coefficient: 1, dataPoints: 0 });
        continue;
      }
      // Compute across all technologies combined for the full matrix
      const xs: number[] = [];
      const ys: number[] = [];
      for (const item of kpis) {
        const a = item[fieldA as keyof typeof item];
        const b = item[fieldB as keyof typeof item];
        if (typeof a === 'number' && typeof b === 'number' && !isNaN(a) && !isNaN(b)) {
          xs.push(a);
          ys.push(b);
        }
      }
      row.correlations.push({
        fieldB,
        coefficient: pearson(xs, ys),
        dataPoints: xs.length,
      });
    }
    fullMatrix.push(row);
  }

  return NextResponse.json({
    type: 'kpi',
    from: since.toISOString(),
    to: now.toISOString(),
    technologies: techs,
    totalDataPoints: kpis.length,
    pairResults: techResults,
    heatmapMatrix,
    fullCorrelationMatrix: fullMatrix,
  });
}