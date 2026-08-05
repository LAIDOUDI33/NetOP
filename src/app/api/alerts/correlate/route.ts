import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

type GroupedAlert = {
  id: string;
  siteId: string | null;
  siteName: string | null;
  region: string | null;
  technology: string;
  severity: string;
  metric: string;
  createdAt: Date;
};

function minutesBetween(a: Date, b: Date) {
  return Math.abs(a.getTime() - b.getTime()) / 60_000;
}

function tryCorrelate(
  current: GroupedAlert,
  candidate: GroupedAlert,
  groupTime: Date
): boolean {
  // Rule 1: Same site + same tech + within 30 min
  if (
    current.siteId &&
    candidate.siteId &&
    current.siteId === candidate.siteId &&
    current.technology === candidate.technology &&
    minutesBetween(current.createdAt, groupTime) <= 30
  ) {
    return true;
  }
  // Rule 2: Same region + same severity + same metric + within 1 hour
  if (
    current.region &&
    candidate.region &&
    current.region === candidate.region &&
    current.severity === candidate.severity &&
    current.metric === candidate.metric &&
    minutesBetween(current.createdAt, groupTime) <= 60
  ) {
    return true;
  }
  // Rule 3: Same site + any tech + within 15 min
  if (
    current.siteId &&
    candidate.siteId &&
    current.siteId === candidate.siteId &&
    minutesBetween(current.createdAt, groupTime) <= 15
  ) {
    return true;
  }
  return false;
}

export async function POST(request: NextRequest) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 30_000, max: 1 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const alerts = await db.alert.findMany({
      where: { resolvedAt: null },
      include: { site: { select: { id: true, name: true, code: true, region: true, technology: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const mapped: GroupedAlert[] = alerts.map((a) => ({
      id: a.id,
      siteId: a.siteId,
      siteName: a.site?.name ?? null,
      region: a.site?.region ?? null,
      technology: a.technology,
      severity: a.severity,
      metric: a.metric,
      createdAt: a.createdAt,
    }));

    // Simple loop-based grouping: sorted desc by time, build groups
    const groups: { groupId: string; alerts: GroupedAlert[]; firstAt: Date; lastAt: Date }[] = [];

    for (const alert of mapped) {
      let assigned = false;
      for (const group of groups) {
        // Check against the first alert in the group (oldest, since sorted desc)
        const reference = group.alerts[group.alerts.length - 1];
        if (tryCorrelate(alert, reference, reference.createdAt)) {
          group.alerts.push(alert);
          group.lastAt = alert.createdAt;
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        groups.push({
          groupId: crypto.randomUUID(),
          alerts: [alert],
          firstAt: alert.createdAt,
          lastAt: alert.createdAt,
        });
      }
    }

    // Persist: only update groups with >1 alert (singletons get null = uncorrelated)
    const summaryGroups = groups.filter((g) => g.alerts.length > 1);
    for (const group of summaryGroups) {
      const ids = group.alerts.map((a) => a.id);
      await db.alert.updateMany({
        where: { id: { in: ids } },
        data: { correlatedGroupId: group.groupId },
      });
    }
    // Clear correlation on singletons
    const singletons = groups.filter((g) => g.alerts.length === 1);
    for (const g of singletons) {
      await db.alert.update({
        where: { id: g.alerts[0].id },
        data: { correlatedGroupId: null },
      });
    }

    const totalAlerts = alerts.length;
    const noiseReduction = totalAlerts > 0
      ? ((1 - summaryGroups.length / totalAlerts) * 100).toFixed(1)
      : '0.0';

    const groupsOut = summaryGroups.map((g) => {
      const metrics = [...new Set(g.alerts.map((a) => a.metric))];
      const severities = [...new Set(g.alerts.map((a) => a.severity))];
      const worst = severities.includes('critical') ? 'critical' : severities.includes('warning') ? 'warning' : 'info';
      return {
        id: g.groupId,
        siteName: g.alerts[0].siteName ?? 'Unknown',
        region: g.alerts[0].region ?? 'Unknown',
        severity: worst,
        alertCount: g.alerts.length,
        metrics,
        timeRange: `${g.lastAt.toISOString()} — ${g.firstAt.toISOString()}`,
        createdAt: g.firstAt.toISOString(),
      };
    });

    return NextResponse.json({
      correlatedGroups: summaryGroups.length,
      totalAlerts,
      noiseReduction,
      groups: groupsOut,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
