import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { z } from 'zod';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { db } from '@/lib/db';
import { checkApiAuth, authError } from '@/lib/api-auth';
import { triggerIncidentCreated } from '@/lib/notification-triggers';

const correlationSchema = z.object({
  alertIds: z.array(z.string()).optional(),
  timeWindowMinutes: z.number().min(5).max(1440).optional(),
  maxAlerts: z.number().min(5).max(100).optional(),
});

const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

interface GroupedAlerts {
 key: string;
  siteId: string | null;
  technology: string;
  alerts: Array<Record<string, unknown>>;
}

async function fetchAlerts(
  alertIds?: string[],
  timeWindowMinutes?: number,
  maxAlerts?: number,
): Promise<Array<Record<string, unknown>>> {
  const limit = maxAlerts || 30;

  if (alertIds && alertIds.length > 0) {
    const alerts = await db.alert.findMany({
      where: { id: { in: alertIds } },
      include: { site: { select: { name: true, code: true, region: true, technology: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return alerts.map((a) => ({
      id: a.id,
      siteId: a.siteId,
      siteName: a.site?.name,
      siteCode: a.site?.code,
      region: a.site?.region,
      technology: a.technology,
      metric: a.metric,
      value: a.value,
      threshold: a.threshold,
      condition: a.condition,
      severity: a.severity,
      message: a.message,
      acknowledged: a.acknowledged,
      correlatedGroupId: a.correlatedGroupId,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  const windowMs = (timeWindowMinutes || 60) * 60 * 1000;
  const cutoff = new Date(Date.now() - windowMs);

  const alerts = await db.alert.findMany({
    where: {
      acknowledged: false,
      createdAt: { gte: cutoff },
    },
    include: { site: { select: { name: true, code: true, region: true, technology: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return alerts.map((a) => ({
    id: a.id,
    siteId: a.siteId,
    siteName: a.site?.name,
    siteCode: a.site?.code,
    region: a.site?.region,
    technology: a.technology,
    metric: a.metric,
    value: a.value,
    threshold: a.threshold,
    condition: a.condition,
    severity: a.severity,
    message: a.message,
    acknowledged: a.acknowledged,
    correlatedGroupId: a.correlatedGroupId,
    createdAt: a.createdAt.toISOString(),
  }));
}

function groupAlerts(alerts: Array<Record<string, unknown>>): GroupedAlerts[] {
  const groups = new Map<string, GroupedAlerts>();

  for (const alert of alerts) {
    const siteId = (alert.siteId as string) || 'unknown';
    const tech = (alert.technology as string) || 'unknown';
    const key = `${siteId}::${tech}`;

    if (!groups.has(key)) {
      groups.set(key, { key, siteId: alert.siteId as string | null, technology: tech, alerts: [] });
    }
    groups.get(key)!.alerts.push(alert);
  }

  return Array.from(groups.values()).filter((g) => g.alerts.length >= 1);
}

function buildCorrelationPrompt(groups: GroupedAlerts[]): string {
  const groupSummaries = groups.map((g, idx) => ({
    groupIndex: idx,
    siteId: g.siteId,
    siteName: g.alerts[0]?.siteName,
    technology: g.technology,
    alertCount: g.alerts.length,
    alerts: g.alerts.map((a) => ({
      id: a.id,
      metric: a.metric,
      severity: a.severity,
      value: a.value,
      threshold: a.threshold,
      message: a.message,
      createdAt: a.createdAt,
    })),
  }));

  return `You are NetOptima Algeria Smart Alert Correlation Engine. Analyze grouped network alerts and identify correlated alert groups that indicate potential incidents.

CONTEXT - Alert groups by site and technology (${groups.length} groups):

${JSON.stringify(groupSummaries, null, 2)}

INSTRUCTIONS:
1. Identify groups of alerts that appear to be correlated — i.e., multiple alerts on the same site/technology that share a common root cause.
2. A single alert by itself can also be an incident if it is critical.
3. For each correlation group, determine:
   - summary: Brief description of the incident
   - severity: "low" | "medium" | "high" | "critical" — use the highest severity of the constituent alerts, upgrade if multiple high/critical alerts are involved
   - affectedSiteIds: Array of site IDs involved
   - rootCauseHypothesis: Your best guess at the underlying cause (e.g., "Power supply degradation", "Interference from adjacent cell", "Transport link failure", "Capacity overload")
   - recommendedActions: Array of 1-3 recommended actions to address the incident
   - technology: The primary technology affected
   - alertIds: Array of alert IDs that belong to this correlation
4. Be specific with root cause hypotheses — reference actual metrics and values.
5. Consider Algeria telecom context (Djezzy/Mobilis/Ooredoo networks, common issues like power outages, interference, transport failures).

Return ONLY a JSON array of correlation groups. Each object must have: summary, severity, affectedSiteIds, rootCauseHypothesis, recommendedActions, technology, alertIds.
If no meaningful correlations are found, return an empty array [].
Do not include any explanation outside the JSON array.`;
}

interface LLMCorrelationGroup {
  summary: string;
  severity: string;
  affectedSiteIds: string[];
  rootCauseHypothesis: string;
  recommendedActions: string[];
  technology: string;
  alertIds: string[];
}

export async function POST(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 10 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const body = await request.json();
    const parsed = correlationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { alertIds, timeWindowMinutes, maxAlerts } = parsed.data;

    // Fetch alerts
    const alerts = await fetchAlerts(alertIds, timeWindowMinutes, maxAlerts);
    if (alerts.length === 0) {
      return NextResponse.json({ correlations: [], message: 'No alerts found for the given filters.' });
    }

    // Group alerts by siteId + technology
    const groups = groupAlerts(alerts);

    // Call LLM to identify correlations
    const zai = await getZai();
    const prompt = buildCorrelationPrompt(groups);
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: `Analyze these ${alerts.length} alerts across ${groups.length} site/technology groups. Identify correlated groups that indicate incidents. Return a JSON array only.` },
      ],
      stream: false,
      thinking: { type: 'disabled' },
    });

    const raw = completion.choices?.[0]?.message?.content || '[]';

    // Extract JSON from the response
    let jsonStr = raw;
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (arrayMatch) jsonStr = arrayMatch[0];

    let parsedCorrelations: LLMCorrelationGroup[];
    try {
      parsedCorrelations = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ error: 'Failed to parse LLM response as JSON', raw }, { status: 500 });
    }

    if (!Array.isArray(parsedCorrelations) || parsedCorrelations.length === 0) {
      return NextResponse.json({ correlations: [], message: 'No significant alert correlations detected.' });
    }

    // Create/update Incident records and set correlatedGroupId on alerts
    const correlationResults = [];

    for (const corr of parsedCorrelations) {
      const validSeverity = VALID_SEVERITIES.includes(corr.severity as typeof VALID_SEVERITIES[number])
        ? corr.severity
        : 'medium';

      const alertIdList = Array.isArray(corr.alertIds) ? corr.alertIds.map(String) : [];
      const affectedSiteIdList = Array.isArray(corr.affectedSiteIds) ? corr.affectedSiteIds.map(String) : [];

      // Generate a correlation group ID
      const correlationGroupId = `corr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // Create the Incident record
      const incident = await db.incident.create({
        data: {
          title: String(corr.summary || 'Correlated Alert Incident').slice(0, 200),
          description: `Root cause hypothesis: ${corr.rootCauseHypothesis || 'Unknown'}\nRecommended actions: ${(corr.recommendedActions || []).join(', ')}`,
          technology: String(corr.technology || '4G'),
          siteId: affectedSiteIdList[0] || null,
          severity: validSeverity,
          status: 'open',
          category: 'network',
          priority: validSeverity === 'critical' ? 1 : validSeverity === 'high' ? 2 : validSeverity === 'medium' ? 4 : 5,
          reportedBy: 'ai-alert-correlation',
          rootCause: String(corr.rootCauseHypothesis || ''),
          affectedSites: JSON.stringify(affectedSiteIdList),
          relatedAlerts: JSON.stringify(alertIdList),
        },
      });

      // Update correlatedGroupId on all alerts in this correlation
      if (alertIdList.length > 0) {
        await db.alert.updateMany({
          where: { id: { in: alertIdList } },
          data: { correlatedGroupId: incident.id },
        });
      }

      // Fire notification
      await triggerIncidentCreated(incident.id, incident.title, incident.severity);

      correlationResults.push({
        incidentId: incident.id,
        correlationGroupId,
        summary: corr.summary,
        severity: validSeverity,
        affectedSites: affectedSiteIdList,
        alertCount: alertIdList.length,
        rootCauseHypothesis: corr.rootCauseHypothesis,
        recommendedActions: corr.recommendedActions,
        technology: corr.technology,
      });
    }

    return NextResponse.json({
      correlations: correlationResults,
      alertsAnalyzed: alerts.length,
      groupsIdentified: groups.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
