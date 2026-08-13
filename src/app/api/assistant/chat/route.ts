import { NextRequest } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { z } from 'zod';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { db } from '@/lib/db';
import { checkApiAuth, authError } from '@/lib/api-auth';

const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).min(1).max(40),
  currentView: z.string().optional(),
});

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

/**
 * Lightweight data fetcher — runs targeted queries based on question keywords.
 */
async function fetchRelevantContext(question: string): Promise<string> {
  const q = question.toLowerCase();
  const parts: string[] = [];

  // Sites
  if (/site|cell|tower|basestation|station|count|total|how many/.test(q)) {
    const [byTech, byStatus, total] = await Promise.all([
      db.networkSite.groupBy({ by: ['technology'], _count: true }),
      db.networkSite.groupBy({ by: ['status'], _count: true }),
      db.networkSite.count(),
    ]);
    parts.push(`Sites: ${total} total, by tech: ${JSON.stringify(Object.fromEntries(byTech.map(r => [r.technology, r._count])))}, by status: ${JSON.stringify(Object.fromEntries(byStatus.map(r => [r.status, r._count])))}`);
  }

  // Alerts
  if (/alert|alarm|warning|critical|severity|acknowledge/.test(q)) {
    const [bySev, total] = await Promise.all([
      db.alert.groupBy({ by: ['severity'], where: { acknowledged: false }, _count: true }),
      db.alert.count({ where: { acknowledged: false } }),
    ]);
    const recent = await db.alert.findMany({ where: { acknowledged: false }, orderBy: { createdAt: 'desc' }, take: 5, select: { message: true, severity: true, site: { select: { name: true, code: true } } } });
    parts.push(`Active alerts: ${total} (${JSON.stringify(Object.fromEntries(bySev.map(r => [r.severity, r._count])))}). Latest: ${JSON.stringify(recent.map(a => ({ sev: a.severity, msg: a.message, site: a.site?.name })))}`);
  }

  // KPIs
  if (/kpi|rsrp|rsrq|sinr|throughput|latency|availability|prb|handover|drop|performance|metric/.test(q)) {
    const avg = await db.kpiMetric.aggregate({ _avg: { rsrp: true, rsrq: true, sinr: true, downloadThroughput: true, uploadThroughput: true, latency: true, availability: true, prbUtilization: true, handoverSuccessRate: true, dropRate: true } });
    const r = (v: number | null) => v == null ? 'N/A' : (Math.round(v * 100) / 100);
    parts.push(`KPI averages: RSRP=${r(avg._avg.rsrp)} dBm, RSRQ=${r(avg._avg.rsrq)} dB, SINR=${r(avg._avg.sinr)} dB, DL=${r(avg._avg.downloadThroughput)} Mbps, UL=${r(avg._avg.uploadThroughput)} Mbps, Latency=${r(avg._avg.latency)} ms, Availability=${r(avg._avg.availability)}%, PRB=${r(avg._avg.prbUtilization)}%, HOSR=${r(avg._avg.handoverSuccessRate)}%, Drop=${r(avg._avg.dropRate)}%`);
  }

  // Capacity
  if (/capacity|utilization|congestion|forecast|growth|load/.test(q)) {
    const [byRisk, highRisk] = await Promise.all([
      db.capacityForecast.groupBy({ by: ['riskLevel'], _count: true }),
      db.capacityForecast.findMany({ where: { riskLevel: { in: ['high', 'critical'] } }, take: 5, include: { site: { select: { name: true, region: true } } } }),
    ]);
    parts.push(`Capacity risks: ${JSON.stringify(Object.fromEntries(byRisk.map(r => [r.riskLevel, r._count])))}. High/Critical: ${JSON.stringify(highRisk.map(h => ({ site: h.site?.name, region: h.site?.region, risk: h.riskLevel, load: h.currentLoad })))}`);
  }

  // Churn
  if (/churn|subscriber|customer|retention|wilaya|region|revenue/.test(q)) {
    const increasing = await db.churnPrediction.findMany({ where: { churnTrend: 'increasing' }, orderBy: { highRiskCount: 'desc' }, take: 5, select: { wilaya: true, segmentName: true, churnRate: true, predictedChurnRate: true, atRiskCount: true, revenueAtRisk: true } });
    parts.push(`Churn (increasing trend, top 5 wilayas): ${JSON.stringify(increasing)}`);
  }

  // Faults
  if (/fault|failure|outage|hardware|component/.test(q)) {
    const critical = await db.faultPrediction.findMany({ where: { severity: { in: ['critical', 'high'] } }, take: 5, include: { site: { select: { name: true, region: true } } } });
    parts.push(`Critical/High fault predictions: ${JSON.stringify(critical.map(f => ({ site: f.site?.name, severity: f.severity, component: f.componentType, confidence: f.confidenceScore })))}`);
  }

  // Anomalies
  if (/anomal|deviation|outlier|z-score|detection/.test(q)) {
    const [active, today] = await Promise.all([
      db.anomalyEvent.count({ where: { status: 'detected' } }),
      db.anomalyEvent.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    ]);
    const recent = await db.anomalyEvent.findMany({ where: { status: 'detected' }, orderBy: { createdAt: 'desc' }, take: 3, select: { metric: true, value: true, expectedRange: true, site: { select: { name: true } } } });
    parts.push(`Anomalies: ${active} active, ${today} today. Latest: ${JSON.stringify(recent.map(a => ({ metric: a.metric, value: a.value, expected: a.expectedRange, site: a.site?.name })))}`);
  }

  // Health
  if (/health|score|degrad|overall/.test(q)) {
    const [byTech, avg] = await Promise.all([
      db.healthScore.groupBy({ by: ['technology'], _avg: { score: true }, _count: true }),
      db.healthScore.aggregate({ _avg: { score: true } }),
    ]);
    parts.push(`Health scores: avg=${Math.round((avg._avg.score ?? 0) * 100) / 100}, by tech: ${JSON.stringify(Object.fromEntries(byTech.map(r => [r.technology, { avg: Math.round((r._avg.score ?? 0) * 100) / 100, count: r._count }])))}`);
  }

  // Energy
  if (/energy|power|consumption|pue|cost/.test(q)) {
    const avg = await db.energyMetric.aggregate({ _avg: { energyConsumption: true, pue: true, costSavings: true } });
    const r = (v: number | null) => v == null ? 'N/A' : (Math.round(v * 100) / 100);
    parts.push(`Energy averages: consumption=${r(avg._avg.energyConsumption)} kW, PUE=${r(avg._avg.pue)}, savings=${r(avg._avg.costSavings)} DZD`);
  }

  // Traffic
  if (/traffic|volume|usage|data|mbps|gb/.test(q)) {
    const forecasts = await db.trafficForecast.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
    const avgGrowth = forecasts.reduce((s, f) => s + f.growthRate, 0) / (forecasts.length || 1);
    parts.push(`Traffic forecasts: avg growth=${Math.round(avgGrowth * 100) / 100}%. Latest: ${JSON.stringify(forecasts.slice(0, 3).map(f => ({ current: f.currentTraffic, forecast: f.forecastedTraffic, growth: f.growthRate })))}`);
  }

  // Default minimal overview
  if (parts.length === 0) {
    const [total, activeAlerts, avgAvail] = await Promise.all([
      db.networkSite.count(),
      db.alert.count({ where: { acknowledged: false } }),
      db.kpiMetric.aggregate({ _avg: { availability: true } }),
    ]);
    parts.push(`Quick overview: ${total} sites, ${activeAlerts} active alerts, avg availability=${avgAvail._avg.availability == null ? 'N/A' : Math.round(avgAvail._avg.availability * 100) / 100 + '%'}`);
  }

  return parts.join('\n');
}

function buildSystemPrompt(currentView?: string, networkContext?: string): string {
  let prompt = `You are NetOptima Alg\u00e9rie AI Assistant \u2014 an expert telecom network optimization analyst for Algeria's mobile network (2G/3G/4G/5G).

Core responsibilities:
- Diagnose network issues using real-time data
- Interpret KPIs (RSRP, RSRQ, SINR, throughput, latency, availability, PRB utilization, handover success rate, drop rate)
- Suggest specific, actionable optimizations
- Compare technologies, regions, and vendors
- Explain technical concepts clearly

Rules:
- ALWAYS cite specific numbers from the data provided
- Use bullet points for multi-part answers
- Be concise but thorough
- If asked about something not in the data, say so clearly
- Respond in the SAME LANGUAGE the user writes in (French, English, or Arabic)
- For technical terms, include brief explanations
- When suggesting navigation, use format: [Navigate: view-name]`;

  if (currentView) {
    prompt += `\n\nThe user is currently viewing the "${currentView}" module. Consider this context in your response.`;
  }

  if (networkContext) {
    prompt += `\n\n=== REAL-TIME NETWORK DATA ===\n${networkContext}\n=== END DATA ===\n\nAnalyze this data to answer the user's question. Reference specific values. Algerian regions are called "wilayas".`;
  }

  return prompt;
}

export async function POST(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const body = await request.json();
    const parsed = chatSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Validation failed' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const { messages, currentView } = parsed.data;
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');

    // Fetch relevant network data in parallel with ZAI init
    const [networkContext, zai] = await Promise.all([
      lastUserMsg ? fetchRelevantContext(lastUserMsg.content) : Promise.resolve(''),
      getZai(),
    ]);

    const systemPrompt = buildSystemPrompt(currentView, networkContext);

    // Build message array: system + last 20 messages
    const recentMessages = messages.slice(-20);
    const apiMessages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...recentMessages,
    ];

    // Stream the response
    const stream = await zai.chat.completions.create({
      messages: apiMessages,
      stream: true,
      thinking: { type: 'disabled' },
    }) as ReadableStream<Uint8Array>;

    // Transform SSE stream to plain text chunks
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const transformed = new ReadableStream({
      async start(controller) {
        const reader = stream.getReader();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(':')) continue;

              if (trimmed.startsWith('data: ')) {
                const data = trimmed.slice(6);
                if (data === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(encoder.encode(content));
                  }
                } catch {
                  // Non-JSON line, skip
                }
              }
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(transformed, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
