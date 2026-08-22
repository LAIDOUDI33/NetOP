import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 60 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const alerts = await db.alert.findMany({
      where: { resolvedAt: null, correlatedGroupId: { not: null } },
      include: { site: { select: { name: true, region: true, technology: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Group by correlatedGroupId
    const map = new Map<string, typeof alerts>();
    for (const a of alerts) {
      const gid = a.correlatedGroupId!;
      const arr = map.get(gid);
      if (arr) arr.push(a);
      else map.set(gid, [a]);
    }

    function worstSeverity(severities: string[]) {
      if (severities.includes('critical')) return 'critical';
      if (severities.includes('warning')) return 'warning';
      return 'info';
    }

    function formatDuration(ms: number) {
      const mins = Math.floor(ms / 60_000);
      if (mins < 60) return `${mins}m`;
      const hrs = Math.floor(mins / 60);
      const rem = mins % 60;
      return `${hrs}h ${rem}m`;
    }

    const incidents = [...map.entries()].map(([id, groupAlerts]) => {
      const severities = groupAlerts.map((a) => a.severity);
      const severity = worstSeverity(severities);
      const metrics = [...new Set(groupAlerts.map((a) => a.metric))];
      const technologies = [...new Set(groupAlerts.map((a) => a.technology))];
      const regions = [...new Set(groupAlerts.map((a) => a.site?.region).filter(Boolean))] as string[];
      const sites = [...new Set(groupAlerts.map((a) => a.site?.name).filter(Boolean))] as string[];

      const timestamps = groupAlerts.map((a) => a.createdAt.getTime());
      const firstAt = new Date(Math.min(...timestamps));
      const lastAt = new Date(Math.max(...timestamps));
      const duration = formatDuration(Date.now() - firstAt.getTime());

      // Generate title
      let title: string;
      if (sites.length === 1) {
        title = metrics.length > 1
          ? `Multi-metric degradation at ${sites[0]}`
          : `${severity.charAt(0).toUpperCase() + severity.slice(1)} ${metrics[0]} at ${sites[0]}`;
      } else if (regions.length === 1) {
        title = `Regional ${severity} alerts in ${regions[0]}`;
      } else {
        title = `${severity.charAt(0).toUpperCase() + severity.slice(1)} incident — ${groupAlerts.length} alerts`;
      }

      return {
        id,
        title,
        severity,
        alertCount: groupAlerts.length,
        siteName: sites.length === 1 ? sites[0] : `${sites.length} sites`,
        region: regions.length === 1 ? regions[0] : 'Multi-region',
        technology: technologies.length === 1 ? technologies[0] : technologies.join('/'),
        metrics,
        duration,
        firstAlertAt: firstAt.toISOString(),
        lastAlertAt: lastAt.toISOString(),
        alerts: groupAlerts.map((a) => ({
          id: a.id,
          metric: a.metric,
          value: a.value,
          severity: a.severity,
          message: a.message,
          createdAt: a.createdAt.toISOString(),
        })),
      };
    });

    // Sort: critical first, then by alert count desc
    incidents.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      if (order[a.severity] !== order[b.severity]) return order[a.severity] - order[b.severity];
      return b.alertCount - a.alertCount;
    });

    return NextResponse.json(incidents);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
