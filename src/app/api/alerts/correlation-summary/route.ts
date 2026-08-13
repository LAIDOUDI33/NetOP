import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 60 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const unresolved = await db.alert.findMany({
      where: { resolvedAt: null },
      include: { site: { select: { name: true, region: true } } },
    });

    const totalAlerts = unresolved.length;
    const correlatedAlerts = unresolved.filter((a) => a.correlatedGroupId !== null);
    const uncorrelatedAlerts = unresolved.filter((a) => a.correlatedGroupId === null);

    // Count unique groups
    const groupIds = [...new Set(correlatedAlerts.map((a) => a.correlatedGroupId!))];
    const correlationGroups = groupIds.length;

    // Build group aggregates for top 5
    const groupMap = new Map<string, {
      alertCount: number;
      siteName: string;
      region: string;
      severities: string[];
      metrics: string[];
      firstAt: Date;
      lastAt: Date;
    }>();

    for (const alert of correlatedAlerts) {
      const gid = alert.correlatedGroupId!;
      const existing = groupMap.get(gid);
      if (!existing) {
        groupMap.set(gid, {
          alertCount: 1,
          siteName: alert.site?.name ?? 'Unknown',
          region: alert.site?.region ?? 'Unknown',
          severities: [alert.severity],
          metrics: [alert.metric],
          firstAt: alert.createdAt,
          lastAt: alert.createdAt,
        });
      } else {
        existing.alertCount += 1;
        if (!existing.severities.includes(alert.severity)) existing.severities.push(alert.severity);
        if (!existing.metrics.includes(alert.metric)) existing.metrics.push(alert.metric);
        if (alert.createdAt < existing.firstAt) existing.firstAt = alert.createdAt;
        if (alert.createdAt > existing.lastAt) existing.lastAt = alert.createdAt;
      }
    }

    // Sort by alert count desc, take top 5
    const topGroups = [...groupMap.entries()]
      .sort((a, b) => b[1].alertCount - a[1].alertCount)
      .slice(0, 5)
      .map(([groupId, g]) => {
        const worst = g.severities.includes('critical') ? 'critical' : g.severities.includes('warning') ? 'warning' : 'info';
        return {
          groupId,
          alertCount: g.alertCount,
          siteName: g.siteName,
          region: g.region,
          severity: worst,
          metrics: g.metrics,
          timeRange: `${g.firstAt.toISOString()} — ${g.lastAt.toISOString()}`,
        };
      });

    const noiseReductionPct = totalAlerts > 0
      ? parseFloat(((1 - correlationGroups / totalAlerts) * 100).toFixed(1))
      : 0;

    return NextResponse.json({
      totalAlerts,
      correlatedAlerts: correlatedAlerts.length,
      uncorrelatedAlerts: uncorrelatedAlerts.length,
      correlationGroups,
      noiseReductionPct,
      topGroups,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
