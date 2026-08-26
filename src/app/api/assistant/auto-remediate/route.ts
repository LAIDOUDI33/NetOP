import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { z } from 'zod';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { db } from '@/lib/db';
import { checkApiAuth, authError } from '@/lib/api-auth';
import { triggerAiAutoRemediation } from '@/lib/notification-triggers';

const remediateSchema = z.object({
  siteId: z.string().optional(),
  technology: z.string().optional(),
  region: z.string().optional(),
  severity: z.string().optional(),
  autoApprove: z.boolean().optional(),
});

const VALID_CATEGORIES = ['power', 'tilt', 'azimuth', 'frequency', 'handover', 'capacity', 'coverage', 'interference', 'parameter'] as const;
const VALID_RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

interface IssueContext {
  alerts: Array<Record<string, unknown>>;
  anomalies: Array<Record<string, unknown>>;
  healthScores: Array<Record<string, unknown>>;
  faultPredictions: Array<Record<string, unknown>>;
}

async function gatherIssueContext(
  siteId?: string,
  technology?: string,
  region?: string,
  severity?: string,
): Promise<IssueContext> {
  const whereAlert: Record<string, unknown> = { acknowledged: false };
  if (siteId) whereAlert.siteId = siteId;
  if (technology) whereAlert.technology = technology;
  if (severity) whereAlert.severity = severity;

  const whereAnomaly: Record<string, unknown> = { status: 'detected' };
  if (siteId) whereAnomaly.siteId = siteId;
  if (technology) whereAnomaly.technology = technology;
  if (severity) whereAnomaly.severity = severity;

  const whereHealth: Record<string, unknown> = {};
  if (siteId) whereHealth.siteId = siteId;
  if (technology) whereHealth.technology = technology;
  if (region) whereHealth.region = region;

  const whereFault: Record<string, unknown> = { status: 'predicted' };
  if (siteId) whereFault.siteId = siteId;
  if (technology) whereFault.technology = technology;
  if (severity) whereFault.severity = severity;

  const [alerts, anomalies, healthScores, faultPredictions] = await Promise.all([
    db.alert.findMany({
      where: whereAlert,
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { site: { select: { name: true, code: true, region: true, technology: true } } },
    }),
    db.anomalyEvent.findMany({
      where: whereAnomaly,
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: { site: { select: { name: true, code: true, region: true, technology: true } } },
    }),
    db.healthScore.findMany({
      where: { ...whereHealth, overallScore: { lt: 75 } },
      orderBy: { overallScore: 'asc' },
      take: 15,
      include: { site: { select: { name: true, code: true, region: true, technology: true } } },
    }),
    db.faultPrediction.findMany({
      where: whereFault,
      orderBy: { probability: 'desc' },
      take: 10,
      include: { site: { select: { name: true, code: true, region: true, technology: true } } },
    }),
  ]);

  return {
    alerts: alerts.map((a) => ({
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
      createdAt: a.createdAt.toISOString(),
    })),
    anomalies: anomalies.map((a) => ({
      id: a.id,
      siteId: a.siteId,
      siteName: a.site?.name,
      region: a.site?.region,
      technology: a.technology,
      metric: a.metric,
      actualValue: a.actualValue,
      expectedValue: a.expectedValue,
      zScore: a.zScore,
      severity: a.severity,
      description: a.description,
    })),
    healthScores: healthScores.map((h) => ({
      id: h.id,
      siteId: h.siteId,
      siteName: h.site?.name,
      region: h.region,
      technology: h.technology,
      overallScore: h.overallScore,
      coverageScore: h.coverageScore,
      capacityScore: h.capacityScore,
      qualityScore: h.qualityScore,
      reliabilityScore: h.reliabilityScore,
      experienceScore: h.experienceScore,
      grade: h.grade,
      trend: h.trend,
      issues: h.issues,
    })),
    faultPredictions: faultPredictions.map((f) => ({
      id: f.id,
      siteId: f.siteId,
      siteName: f.site?.name,
      region: f.site?.region,
      technology: f.technology,
      component: f.component,
      faultType: f.faultType,
      probability: f.probability,
      severity: f.severity,
      confidence: f.confidence,
      recommendedAction: f.recommendedAction,
      estimatedTimeToFail: f.estimatedTimeToFail,
    })),
  };
}

function buildRemediationPrompt(context: IssueContext): string {
  return `You are NetOptima Algeria AI Auto-Remediation Engine. Your task is to analyze network issues and generate specific, actionable change requests for Algeria's mobile network (Djezzy/Mobilis/Ooredoo).

CONTEXT - Current Network Issues:

## Unacknowledged Alerts (${context.alerts.length})
${JSON.stringify(context.alerts, null, 2)}

## Active Anomalies (${context.anomalies.length})
${JSON.stringify(context.anomalies, null, 2)}

## Poor Health Scores (< 75, ${context.healthScores.length} sites)
${JSON.stringify(context.healthScores, null, 2)}

## Fault Predictions (${context.faultPredictions.length})
${JSON.stringify(context.faultPredictions, null, 2)}

INSTRUCTIONS:
1. Analyze the above issues carefully. Cross-reference alerts, anomalies, health scores, and fault predictions for the same site/technology.
2. For each actionable issue, generate a specific change request with proposed parameter values.
3. Be CONSERVATIVE — only suggest changes for clear, well-defined issues. Do not speculate.
4. Consider Algeria telecom context: typical 4G LTE parameters (earfcn, bandwidth, tx power, tilt ranges), 3G UMTS, 2G GSM parameters.
5. Use realistic parameter values for Algeria network (e.g., LTE band 3 (1800 MHz), band 7 (2600 MHz), band 20 (800 MHz)).

For each change request, provide:
- title: Brief descriptive title
- technology: "2G" | "3G" | "4G" | "5G"
- category: one of: "power", "tilt", "azimuth", "frequency", "handover", "capacity", "coverage", "interference", "parameter"
- parameter: The specific network parameter to change (e.g., "electricalTilt", "txPower", "cellReselPriority", "earfcnDL")
- previousValue: Current or estimated current value
- proposedValue: The recommended new value
- reason: Why this change should be made, referencing specific data
- impact: Expected KPI improvement
- riskLevel: "low" | "medium" | "high" | "critical"

Return ONLY a JSON array of change requests. If no clear issues warrant changes, return an empty array [].
Do not include any explanation outside the JSON array.`;
}

interface LLMChangeRequest {
  title: string;
  technology: string;
  category: string;
  parameter: string;
  previousValue: string;
  proposedValue: string;
  reason: string;
  impact: string;
  riskLevel: string;
  siteId?: string;
  siteName?: string;
}

export async function POST(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 10 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const body = await request.json();
    const parsed = remediateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { siteId, technology, region, severity, autoApprove } = parsed.data;

    // Gather all relevant issue context from the database
    const context = await gatherIssueContext(siteId, technology, region, severity);

    const totalIssues = context.alerts.length + context.anomalies.length + context.healthScores.length + context.faultPredictions.length;
    if (totalIssues === 0) {
      return NextResponse.json({ changeRequests: [], message: 'No actionable issues found for the given filters.' });
    }

    // Call LLM to generate remediation recommendations
    const zai = await getZai();
    const systemPrompt = buildRemediationPrompt(context);
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze these ${totalIssues} network issues and generate specific change requests. Return a JSON array only.` },
      ],
      stream: false,
      thinking: { type: 'disabled' },
    });

    const raw = completion.choices?.[0]?.message?.content || '[]';

    // Extract JSON from the response (handle markdown code blocks)
    let jsonStr = raw;
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();
    // Also try to find array if there's surrounding text
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (arrayMatch) jsonStr = arrayMatch[0];

    let parsedChanges: LLMChangeRequest[];
    try {
      parsedChanges = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ error: 'Failed to parse LLM response as JSON', raw }, { status: 500 });
    }

    if (!Array.isArray(parsedChanges) || parsedChanges.length === 0) {
      return NextResponse.json({ changeRequests: [], message: 'AI determined no changes were needed.' });
    }

    // Validate and create ChangeRequest records
    const changeRequests = [];
    for (const change of parsedChanges) {
      const validCategory = VALID_CATEGORIES.includes(change.category as typeof VALID_CATEGORIES[number])
        ? change.category
        : 'parameter';
      const validRisk = VALID_RISK_LEVELS.includes(change.riskLevel as typeof VALID_RISK_LEVELS[number])
        ? change.riskLevel
        : 'medium';

      const record = await db.changeRequest.create({
        data: {
          title: String(change.title || 'Untitled change request').slice(0, 200),
          technology: String(change.technology || '4G'),
          siteId: change.siteId || siteId || null,
          siteName: change.siteName || null,
          category: validCategory,
          parameter: String(change.parameter || 'unknown'),
          previousValue: String(change.previousValue || 'N/A'),
          proposedValue: String(change.proposedValue || 'N/A'),
          reason: String(change.reason || ''),
          impact: String(change.impact || ''),
          riskLevel: validRisk,
          status: autoApprove ? 'approved' : 'pending',
          requestedBy: 'ai-auto-remediation',
          approvedBy: autoApprove ? 'ai-auto-remediation' : null,
        },
      });

      // Fire notification for each change request
      await triggerAiAutoRemediation(
        record.id,
        record.siteName || 'Unknown Site',
        `${record.title} (${record.category}/${record.parameter})`,
      );

      changeRequests.push(record);
    }

    return NextResponse.json({
      changeRequests,
      issuesAnalyzed: {
        alerts: context.alerts.length,
        anomalies: context.anomalies.length,
        healthScores: context.healthScores.length,
        faultPredictions: context.faultPredictions.length,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
