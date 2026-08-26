import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { z } from 'zod';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { db } from '@/lib/db';
import { checkApiAuth, authError } from '@/lib/api-auth';

const analysisSchema = z.object({
  focus: z.enum(['all', 'capacity', 'churn', 'faults', 'traffic', 'revenue']).optional().default('all'),
});

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

export async function POST(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 15 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const body = await request.json();
    const { focus } = analysisSchema.parse(body);

    // Fetch relevant prediction data in parallel
    const queries: Promise<unknown>[] = [];

    if (focus === 'all' || focus === 'capacity') {
      queries.push(
        db.capacityForecast.findMany({
          where: { riskLevel: { in: ['high', 'critical'] } },
          take: 10,
          include: { site: { select: { name: true, region: true, technology: true } } },
          orderBy: { currentLoad: 'desc' },
        }),
      );
    }
    if (focus === 'all' || focus === 'churn') {
      queries.push(
        db.churnPrediction.findMany({
          where: { churnTrend: 'increasing' },
          take: 10,
          orderBy: { highRiskCount: 'desc' },
        }),
      );
    }
    if (focus === 'all' || focus === 'faults') {
      queries.push(
        db.faultPrediction.findMany({
          where: { severity: { in: ['critical', 'high'] } },
          take: 10,
          include: { site: { select: { name: true, region: true, technology: true } } },
          orderBy: { probability: 'desc' },
        }),
      );
    }
    if (focus === 'all' || focus === 'traffic') {
      queries.push(
        db.trafficForecast.findMany({
          take: 10,
          orderBy: { growthRate: 'desc' },
        }),
      );
    }
    if (focus === 'all' || focus === 'revenue') {
      queries.push(
        db.revenueProjection.findMany({
          take: 10,
          orderBy: { growthRate: 'asc' },
        }),
      );
    }

    // Also always get alert context
    queries.push(
      db.alert.groupBy({ by: ['severity'], where: { acknowledged: false }, _count: true }),
    );
    queries.push(db.alert.count({ where: { acknowledged: false, severity: 'critical' } }));

    const results = await Promise.all(queries);

    // Build structured data object for the LLM
    const dataForAI: Record<string, unknown> = {};
    let idx = 0;
    if (focus === 'all' || focus === 'capacity') { dataForAI.capacityRisks = results[idx++]; }
    if (focus === 'all' || focus === 'churn') { dataForAI.churnHotspots = results[idx++]; }
    if (focus === 'all' || focus === 'faults') { dataForAI.criticalFaults = results[idx++]; }
    if (focus === 'all' || focus === 'traffic') { dataForAI.trafficForecasts = results[idx++]; }
    if (focus === 'all' || focus === 'revenue') { dataForAI.revenueRisks = results[idx++]; }
    dataForAI.alertsBySeverity = results[idx++];
    dataForAI.criticalAlertCount = results[idx++];

    const zai = await getZai();

    const systemPrompt = `You are NetOptima Algérie's AI Predictive Analytics Engine. You analyze prediction data for Djezzy's mobile network across Algeria (2G/3G/4G/5G).

Based on the provided prediction data, generate a comprehensive executive analysis that includes:

1. **Executive Summary** (2-3 sentences): Overall network risk posture
2. **Key Findings** (3-5 bullet points): Most critical items with specific numbers
3. **Risk Assessment**: Categorize as Low / Medium / High / Critical with justification
4. **Cross-Domain Correlations**: How different predictions relate (e.g., capacity risk → churn increase)
5. **Prioritized Action Plan** (3-5 items): Ranked by urgency and impact, each with:
   - Action item
   - Expected benefit
   - Timeline suggestion

Use specific numbers from the data. Be concise but thorough. Keep total response under 400 words.
Regions are called "wilayas" in Algeria. Currency is DZD (Algerian Dinar).
If focus is specific to one domain, deep-dive into that domain.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Focus area: ${focus}\n\nPrediction Data:\n${JSON.stringify(dataForAI, null, 2)}` },
      ],
      thinking: { type: 'disabled' },
    });

    const analysis = completion.choices?.[0]?.message?.content || 'Unable to generate analysis.';

    return NextResponse.json({
      analysis,
      focus,
      generatedAt: new Date().toISOString(),
      dataPoints: {
        capacityRisks: Array.isArray(dataForAI.capacityRisks) ? dataForAI.capacityRisks.length : 0,
        churnHotspots: Array.isArray(dataForAI.churnHotspots) ? dataForAI.churnHotspots.length : 0,
        criticalFaults: Array.isArray(dataForAI.criticalFaults) ? dataForAI.criticalFaults.length : 0,
        trafficForecasts: Array.isArray(dataForAI.trafficForecasts) ? dataForAI.trafficForecasts.length : 0,
        revenueRisks: Array.isArray(dataForAI.revenueRisks) ? dataForAI.revenueRisks.length : 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 },
    );
  }
}