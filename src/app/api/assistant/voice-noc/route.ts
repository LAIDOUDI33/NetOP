import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { z } from 'zod';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { db } from '@/lib/db';
import { checkApiAuth, authError } from '@/lib/api-auth';

const voiceNocSchema = z.object({
  audio: z.string().min(1),
  language: z.enum(['en', 'fr', 'ar']).optional().default('en'),
});

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

// -------------------------------------------------------------------
// Reusable DB context fetcher (mirrors chat/route.ts logic)
// -------------------------------------------------------------------
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
  if (/kpi|rsrp|rsrq|sinr|throughput|latency|availability|prb|handover|drop|performance|metric|status/.test(q)) {
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
    parts.push(`Capacity risks: ${JSON.stringify(Object.fromEntries(byRisk.map(r => [r.riskLevel, r._count])))}. High/Critical: ${JSON.stringify(highRisk.map(h => ({ site: h.site?.name, region: h.site?.region, risk: h.riskLevel, current: h.currentValue, forecast: h.forecastValue })))}`);
  }

  // Churn
  if (/churn|subscriber|customer|retention|wilaya|region|revenue/.test(q)) {
    const increasing = await db.churnPrediction.findMany({ where: { churnTrend: 'increasing' }, orderBy: { highRiskCount: 'desc' }, take: 5, select: { wilaya: true, segmentName: true, churnRate: true, predictedChurnRate: true, atRiskCount: true, revenueAtRisk: true } });
    parts.push(`Churn (increasing trend, top 5 wilayas): ${JSON.stringify(increasing)}`);
  }

  // Faults
  if (/fault|failure|outage|hardware|component/.test(q)) {
    const critical = await db.faultPrediction.findMany({ where: { severity: { in: ['critical', 'high'] } }, take: 5, include: { site: { select: { name: true, region: true } } } });
    parts.push(`Critical/High fault predictions: ${JSON.stringify(critical.map(f => ({ site: f.site?.name, severity: f.severity, component: f.component, confidence: f.confidence })))}`);
  }

  // Anomalies
  if (/anomal|deviation|outlier|z-score|detection/.test(q)) {
    const [active, today] = await Promise.all([
      db.anomalyEvent.count({ where: { status: 'detected' } }),
      db.anomalyEvent.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    ]);
    const recent = await db.anomalyEvent.findMany({ where: { status: 'detected' }, orderBy: { createdAt: 'desc' }, take: 3, select: { metric: true, actualValue: true, expectedValue: true, site: { select: { name: true } } } });
    parts.push(`Anomalies: ${active} active, ${today} today. Latest: ${JSON.stringify(recent.map(a => ({ metric: a.metric, actual: a.actualValue, expected: a.expectedValue, site: a.site?.name })))}`);
  }

  // Health
  if (/health|score|degrad|overall/.test(q)) {
    const [byTech, avg] = await Promise.all([
      db.healthScore.groupBy({ by: ['technology'], _avg: { overallScore: true }, _count: true }),
      db.healthScore.aggregate({ _avg: { overallScore: true } }),
    ]);
    parts.push(`Health scores: avg=${Math.round((avg._avg.overallScore ?? 0) * 100) / 100}, by tech: ${JSON.stringify(Object.fromEntries(byTech.map(r => [r.technology, { avg: Math.round((r._avg.overallScore ?? 0) * 100) / 100, count: r._count }])))}`);
  }

  // Energy
  if (/energy|power|consumption|pue|cost/.test(q)) {
    const avg = await db.energyMetric.aggregate({ _avg: { powerConsumption: true, energyConsumed: true, co2Emission: true } });
    const r = (v: number | null) => v == null ? 'N/A' : (Math.round(v * 100) / 100);
    parts.push(`Energy averages: power=${r(avg._avg.powerConsumption)} W, consumed=${r(avg._avg.energyConsumed)} Wh, CO2=${r(avg._avg.co2Emission)} kg`);
  }

  // Traffic
  if (/traffic|volume|usage|data|mbps|gb/.test(q)) {
    const forecasts = await db.trafficForecast.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
    const avgGrowth = forecasts.reduce((s, f) => s + f.growthRate, 0) / (forecasts.length || 1);
    parts.push(`Traffic forecasts: avg growth=${Math.round(avgGrowth * 100) / 100}%. Latest: ${JSON.stringify(forecasts.slice(0, 3).map(f => ({ current: f.currentDailyAvg, forecast: f.forecastedDailyAvg, growth: f.growthRate })))}`);
  }

  // Site-specific query (e.g. "site ALG-001")
  const siteMatch = q.match(/(?:site|station|tower)\s+(?:alg-?|algeria-?|dz-?)(\d{3,})/);
  if (siteMatch) {
    const code = `ALG-${siteMatch[1].padStart(3, '0')}`;
    const site = await db.networkSite.findUnique({ where: { code }, include: { kpis: { take: 1, orderBy: { timestamp: 'desc' } }, healthScores: { take: 1, orderBy: { timestamp: 'desc' } } } });
    if (site) {
      parts.push(`Site ${site.name} (${site.code}): status=${site.status}, tech=${site.technology}, region=${site.region}, vendor=${site.vendor}, latest KPI=${JSON.stringify(site.kpis[0])}, latest health=${JSON.stringify(site.healthScores[0])}`);
    } else {
      parts.push(`Site ${code} not found in database.`);
    }
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

// -------------------------------------------------------------------
// Language-specific NOC system prompt
// -------------------------------------------------------------------
function buildNocSystemPrompt(language: string, networkContext: string): string {
  const langInstructions: Record<string, string> = {
    en: 'Respond in English.',
    fr: 'Répondez en français.',
    ar: 'أجب باللغة العربية.',
  };

  return `You are the NetOptima Algérie Voice NOC Assistant — a hands-free telecom network operations assistant for Algeria's mobile network (2G/3G/4G/5G).

${langInstructions[language] ?? langInstructions.en}

You receive voice commands from NOC operators. Your job is to understand their intent and provide:
1. A clear, concise answer to their question or command
2. Relevant data from the network when available
3. A suggested UI navigation if applicable (using format [Navigate: view-name])
4. A suggested action if applicable (using format [Action: action-description])

Common voice commands and how to handle them:
- "Show me alerts" / "Montre les alertes" → Summarize active alerts and suggest [Navigate: alerts]
- "What's the status of site ALG-XXX?" → Query site health/KPIs from DB context and report
- "Generate a report" / "Génère un rapport" → Suggest [Navigate: executive-report] and [Action: generate-executive-report]
- "Correlate recent alerts" → Suggest [Navigate: alert-correlation] and [Action: run-alert-correlation]
- "Network overview" → Provide high-level KPI summary with counts
- General network questions → Answer with DB context data

Rules:
- ALWAYS cite specific numbers from the data provided
- Be concise — voice responses should be brief and actionable
- Use bullet points for multi-part answers
- If asked about something not in the data, say so clearly
- For technical terms, include brief explanations
- Algerian regions are called "wilayas"

Your response MUST end with a JSON block on its own line in this exact format:
<<<VOICE_ACTION>>>{"suggestedView": "view-name-or-null", "suggestedAction": "action-description-or-null"}<<<END_VOICE_ACTION>>>

=== REAL-TIME NETWORK DATA ===
${networkContext}
=== END DATA ===`;
}

/**
 * Parse the suggested view/action from the LLM response.
 */
function parseVoiceActions(responseText: string): { cleanResponse: string; suggestedView?: string; suggestedAction?: string } {
  const actionMatch = responseText.match(/<<<VOICE_ACTION>>>([\s\S]*?)<<<END_VOICE_ACTION>>>/);
  if (!actionMatch) {
    return { cleanResponse: responseText.trim() };
  }

  try {
    const parsed = JSON.parse(actionMatch[1].trim());
    return {
      cleanResponse: responseText.replace(/<<<VOICE_ACTION>>>[\s\S]*?<<<END_VOICE_ACTION>>>/, '').trim(),
      suggestedView: parsed.suggestedView || undefined,
      suggestedAction: parsed.suggestedAction || undefined,
    };
  } catch {
    return { cleanResponse: responseText.replace(/<<<VOICE_ACTION>>>[\s\S]*?<<<END_VOICE_ACTION>>>/, '').trim() };
  }
}

// -------------------------------------------------------------------
// POST handler
// -------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 10 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    // Accept both JSON body and multipart/form-data
    let audioBase64: string;
    let language: 'en' | 'fr' | 'ar' = 'en';

    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const audioFile = formData.get('audio');
      if (!audioFile) {
        return NextResponse.json({ error: 'audio field is required' }, { status: 400 });
      }
      // audioFile can be a string (base64) or a File/Blob
      if (typeof audioFile === 'string') {
        audioBase64 = audioFile;
      } else if (audioFile instanceof File || audioFile instanceof Blob) {
        const buffer = Buffer.from(await audioFile.arrayBuffer());
        audioBase64 = buffer.toString('base64');
      } else {
        return NextResponse.json({ error: 'Invalid audio format' }, { status: 400 });
      }
      const langParam = formData.get('language');
      if (typeof langParam === 'string' && ['en', 'fr', 'ar'].includes(langParam)) {
        language = langParam as 'en' | 'fr' | 'ar';
      }
    } else {
      // Assume JSON body
      const body = await request.json();
      const parsed = voiceNocSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
      }
      audioBase64 = parsed.data.audio;
      language = parsed.data.language;
    }

    const zai = await getZai();

    // Step 1: Transcribe audio
    const asrResult = await zai.audio.asr.create({
      file_base64: audioBase64,
    });
    const transcription = asrResult.text;

    if (!transcription?.trim()) {
      return NextResponse.json({ transcription: '', response: 'Could not detect speech in the audio.' });
    }

    // Step 2: Fetch DB context based on transcription keywords
    const networkContext = await fetchRelevantContext(transcription);

    // Step 3: Send to LLM with NOC system prompt
    const systemPrompt = buildNocSystemPrompt(language, networkContext);

    const llmResult = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcription },
      ],
      stream: false,
      thinking: { type: 'disabled' },
    });

    // Extract response text from non-streaming result
    type LlmNonStreamResult = { choices?: Array<{ message?: { content?: string } }> };
    const raw = llmResult as LlmNonStreamResult;
    const llmResponse = raw?.choices?.[0]?.message?.content ?? 'No response generated.';

    // Step 4: Parse suggested actions
    const { cleanResponse, suggestedView, suggestedAction } = parseVoiceActions(llmResponse);

    return NextResponse.json({
      transcription,
      response: cleanResponse,
      suggestedView,
      suggestedAction,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
