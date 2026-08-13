import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { z } from 'zod';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { db } from '@/lib/db';
import { checkApiAuth, authError } from '@/lib/api-auth';

const VALID_DOMAINS = ['network', 'kpi', 'capacity', 'churn', 'faults', 'traffic', 'revenue'] as const;
const insightSchema = z.object({
  domain: z.enum(VALID_DOMAINS),
  data: z.any().optional(),
});

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

async function fetchDomainData(domain: string): Promise<string> {
  switch (domain) {
    case 'network': {
      const [scores, alertCount] = await Promise.all([
        db.healthScore.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { site: { select: { name: true, region: true } } } }),
        db.alert.count({ where: { acknowledged: false } }),
      ]);
      return JSON.stringify({ recentHealthScores: scores, activeAlertCount: alertCount });
    }
    case 'kpi': {
      const kpis = await db.kpiMetric.aggregate({
        _avg: { rsrp: true, rsrq: true, sinr: true, downloadThroughput: true, uploadThroughput: true, latency: true, availability: true, prbUtilization: true, handoverSuccessRate: true, dropRate: true },
      });
      return JSON.stringify(kpis);
    }
    case 'capacity': {
      const items = await db.capacityForecast.findMany({ where: { riskLevel: { in: ['high', 'critical'] } }, take: 10, include: { site: { select: { name: true, region: true } } } });
      return JSON.stringify({ highRiskItems: items, count: items.length });
    }
    case 'churn': {
      const items = await db.churnPrediction.findMany({ where: { churnTrend: 'increasing' }, take: 10 });
      return JSON.stringify({ increasingChurn: items, count: items.length });
    }
    case 'faults': {
      const items = await db.faultPrediction.findMany({ where: { severity: { in: ['critical', 'high'] } }, take: 10, include: { site: { select: { name: true, region: true } } } });
      return JSON.stringify({ criticalFaults: items, count: items.length });
    }
    case 'traffic': {
      const forecasts = await db.trafficForecast.findMany({ take: 10 });
      const avgGrowth = forecasts.reduce((s, f) => s + f.growthRate, 0) / (forecasts.length || 1);
      return JSON.stringify({ forecasts, avgGrowthRate: avgGrowth });
    }
    case 'revenue': {
      const projections = await db.revenueProjection.findMany({ take: 10 });
      return JSON.stringify(projections);
    }
    default:
      return '{}';
  }
}

export async function POST(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 20 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const body = await request.json();
    const parsed = insightSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { domain } = parsed.data;
    const dataStr = await fetchDomainData(domain);

    const zai = await getZai();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: `You are a telecom analytics expert. Generate a concise executive insight report based on the following ${domain} data for NetOptima Algeria. Include: 1) Key Findings (2-3 bullet points), 2) Risk Assessment, 3) Recommendations (2-3 actionable items). Be specific with numbers. Keep total response under 300 words.` },
        { role: 'user', content: dataStr },
      ],
      thinking: { type: 'disabled' },
    });

    const report = completion.choices?.[0]?.message?.content || 'No report generated.';
    return NextResponse.json({ report, domain, generatedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
