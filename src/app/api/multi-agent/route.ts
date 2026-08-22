import { NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { db } from '@/lib/db';
import { getDemoNow } from '@/lib/demo-time';
import { checkApiAuth, authError } from '@/lib/api-auth';

// ---- ZAI singleton ----
let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

// ---- Fallback hardcoded chat (kept intact) ----
function generateAgentChatFallback(): Array<{ role: string; agentName?: string; content: string; timestamp: string }> {
  const now = new Date();
  return [
    { role: 'system', content: 'You are the NetOP Multi-Agent orchestrator. Coordinate network AI agents.', timestamp: new Date(now.getTime() - 3600000).toISOString() },
    { role: 'agent', agentName: 'Anomaly Detector', content: 'Detected 3 new anomalies in Alger region: RSRP degradation on 12 sites, throughput drop on 5 eNodeBs.', timestamp: new Date(now.getTime() - 3500000).toISOString() },
    { role: 'orchestrator', content: 'Routing RSRP anomalies to RCA agent. Queuing throughput analysis for Optimizer.', timestamp: new Date(now.getTime() - 3400000).toISOString() },
    { role: 'agent', agentName: 'Root Cause Analyzer', content: 'RCA complete for 8/12 sites. Root cause: tilting misalignment after maintenance. Recommended: restore tilt to original values.', timestamp: new Date(now.getTime() - 3000000).toISOString() },
    { role: 'orchestrator', content: 'RCA confidence > 95%. Forwarding 8 corrective actions to SON Coordinator for auto-remediation.', timestamp: new Date(now.getTime() - 2800000).toISOString() },
    { role: 'agent', agentName: 'SON Coordinator', content: 'Executed 8 tilt corrections. All KPIs returning to baseline. Monitoring for 15 min before closing.', timestamp: new Date(now.getTime() - 2400000).toISOString() },
  ];
}

// ---- Real AI-generated orchestrator chat ----
async function generateAgentChatAI(
  anomalies: Array<{
    id: string; metric: string; actualValue: number; expectedValue: number;
    zScore: number; severity: string; status: string; description: string; createdAt: Date;
    site: { name: string; region: string; technology: string } | null;
  }>,
  activeAlertsCount: number,
  healthScores: Array<{
    id: string; technology: string; overallScore: number; grade: string; trend: string; createdAt: Date;
    site: { name: string; region: string };
  }>,
  capacityRisks: Array<{
    id: string; technology: string; riskLevel: string; currentValue: number;
    forecastValue: number; confidence: number; growthRate: number; recommendation: string; createdAt: Date;
    site: { name: string; region: string } | null;
  }>,
  agentNames: string[],
  now: Date,
): Promise<Array<{ role: string; agentName?: string; content: string; timestamp: string }>> {
  const zai = await getZai();

  const systemPrompt = `You are the NetOP Multi-Agent orchestrator for Djezzy's Algeria telecom network. You coordinate multiple AI agents that monitor, diagnose, and optimize the network.

You are generating a realistic multi-agent orchestration conversation that reflects the CURRENT state of the network.

Based on the network data provided, generate a conversation between the orchestrator and relevant agents. The conversation should:
1. Start with a system message setting the context
2. Have agents report findings from the data
3. Have the orchestrator route tasks and make decisions
4. Show realistic coordination between 2-4 different agents
5. Reference specific sites, regions, metrics, and values from the data
6. Sound like a real NOC (Network Operations Center) coordination
7. Use specific Djezzy/Algeria context (wilayas, site names, technologies)

Available agents: ${agentNames.join(', ')}

You MUST return ONLY a valid JSON array. No markdown, no explanation, no code blocks.
Each element must have: {"role": "system"|"orchestrator"|"agent", "agentName": "Agent Name" (only for role=agent), "content": "...", "timestamp": "ISO8601"}

Generate 5-8 messages. The timestamps should be within the last 60 minutes from ${now.toISOString()}.`;

  const dataSummary = `
=== CURRENT NETWORK DATA ===

RECENT ANOMALIES (last 5):
${anomalies.map(a => `- [${a.severity}] ${a.site?.name ?? 'Unknown'} (${a.site?.region ?? 'N/A'}, ${a.site?.technology ?? a.metric}): ${a.metric} actual=${a.actualValue} expected=${a.expectedValue} zScore=${a.zScore.toFixed(2)} — ${a.description}`).join('\n')}

ACTIVE ALERTS (unacknowledged): ${activeAlertsCount}

SITE HEALTH (latest 3):
${healthScores.map(h => `- ${h.site.name} (${h.site.region}): ${h.technology} score=${h.overallScore} grade=${h.grade} trend=${h.trend}`).join('\n')}

CAPACITY RISKS (high/critical, latest 3):
${capacityRisks.map(c => `- [${c.riskLevel}] ${c.site?.name ?? 'Unknown'} (${c.site?.region ?? 'N/A'}): ${c.technology} current=${c.currentValue} forecast=${c.forecastValue} growth=${(c.growthRate * 100).toFixed(1)}% confidence=${(c.confidence * 100).toFixed(0)}% — ${c.recommendation}`).join('\n')}

=== END DATA ===`;

  const response = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: dataSummary },
    ],
    thinking: { type: 'disabled' },
  });

  const content = (response as any).choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty LLM response');

  // Extract JSON from potential markdown code block
  let jsonStr = content.trim();
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();

  const parsed = JSON.parse(jsonStr);
  if (!Array.isArray(parsed)) throw new Error('LLM response is not an array');

  // Validate and normalize
  return parsed.map((msg: any) => ({
    role: String(msg.role ?? 'system'),
    agentName: msg.agentName ? String(msg.agentName) : undefined,
    content: String(msg.content ?? ''),
    timestamp: msg.timestamp ? new Date(msg.timestamp).toISOString() : now.toISOString(),
  }));
}

export async function GET(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
  const now = await getDemoNow();
  const rows = await db.aiAgent.findMany({ take: 500 });

  const agents = rows.map(a => ({
    id: a.id,
    name: a.name,
    type: a.type,
    description: a.description,
    model: a.model,
    status: a.status,
    tasksCompleted: a.tasksCompleted,
    tasksFailed: a.tasksFailed,
    avgLatencyMs: a.avgLatencyMs,
    successRate: a.successRate,
    uptime: +(a.successRate * 0.99).toFixed(1),
  }));

  // ---- Fetch live data for AI chat + task queue (parallel) ----
  const [recentAnomalies, activeAlertsCount, latestHealth, capacityRisks, detectedAnomalies] =
    await Promise.all([
      db.anomalyEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { site: { select: { name: true, region: true, technology: true } } },
      }),
      db.alert.count({ where: { acknowledged: false } }),
      db.healthScore.findMany({
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: { site: { select: { name: true, region: true } } },
      }),
      db.capacityForecast.findMany({
        where: { riskLevel: { in: ['high', 'critical'] } },
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: { site: { select: { name: true, region: true } } },
      }),
      db.anomalyEvent.findMany({
        where: { status: 'detected' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { site: { select: { name: true, region: true, technology: true } } },
      }),
    ]);

  // ---- AI-generated chat (with fallback) ----
  const agentNames = rows.map(a => a.name);
  let chat: Array<{ role: string; agentName?: string; content: string; timestamp: string }>;
  try {
    chat = await generateAgentChatAI(recentAnomalies, activeAlertsCount, latestHealth, capacityRisks, agentNames, now);
  } catch {
    chat = generateAgentChatFallback();
  }

  // ---- AI-powered task queue from detected anomalies ----
  const anomalyAgent = rows.find(a => a.type === 'anomaly_detection' || a.name.toLowerCase().includes('anomaly'));
  const rcaAgent = rows.find(a => a.type === 'root_cause' || a.name.toLowerCase().includes('root cause'));

  // Generate AI-powered recommendations for detected anomalies
  let aiRecommendations: Array<{ anomalyId: string; recommendation: string; confidence: number }> = [];
  try {
    const anomalySummary = detectedAnomalies.slice(0, 5).map((a, i) => ({
      index: i,
      anomalyId: a.id,
      site: a.site?.name ?? 'Unknown',
      region: a.site?.region ?? 'N/A',
      technology: a.site?.technology ?? a.technology,
      metric: a.metric,
      actualValue: a.actualValue,
      expectedValue: a.expectedValue,
      zScore: a.zScore,
      severity: a.severity,
      description: a.description,
    }));

    if (anomalySummary.length > 0) {
      const zai = await getZai();
      const taskSystemPrompt = `You are a network AI agent in Djezzy's NOC (Algeria). Given a list of network anomalies, generate a specific root-cause recommendation and confidence score for EACH anomaly.

Rules:
- Each recommendation must reference the specific site, metric, and values
- Be specific about the probable root cause and remediation steps
- Confidence: 0.0 to 1.0 — based on how clear the data pattern is
- For critical severity, recommend immediate action
- Use Algeria/wilaya context and realistic telecom terminology

Return ONLY a JSON array with objects: {"anomalyId": "...", "recommendation": "...", "confidence": 0.xx}`;

      const taskCompletion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: taskSystemPrompt },
          { role: 'user', content: JSON.stringify(anomalySummary, null, 2) },
        ],
        thinking: { type: 'disabled' },
      });

      const taskRaw = taskCompletion.choices?.[0]?.message?.content || '';
      const taskJsonMatch = taskRaw.match(/\[[\s\S]*\]/);
      if (taskJsonMatch) {
        const parsed = JSON.parse(taskJsonMatch[0]);
        if (Array.isArray(parsed)) {
          aiRecommendations = parsed.map((r: any) => ({
            anomalyId: String(r.anomalyId ?? ''),
            recommendation: String(r.recommendation ?? ''),
            confidence: typeof r.confidence === 'number' ? Math.max(0.5, Math.min(1, r.confidence)) : 0.85,
          }));
        }
      }
    }
  } catch {
    // AI recommendation failed — will use deterministic fallback below
  }

  const taskQueue = detectedAnomalies.slice(0, 5).map((anomaly, idx) => {
    const isCompleted = idx < 2; // first 2 marked as completed
    const assignedAgent = idx < 2
      ? (rcaAgent ?? anomalyAgent ?? rows[0])
      : (anomalyAgent ?? rows[0]);
    // Deterministic timestamps based on index (no Math.random)
    const completedAt = isCompleted ? new Date(anomaly.createdAt.getTime() + 30000 + idx * 15000).toISOString() : null;
    const latencyMs = isCompleted ? 2000 + idx * 1500 : null;

    // Use AI recommendation if available, otherwise deterministic fallback
    const aiRec = aiRecommendations.find(r => r.anomalyId === anomaly.id);
    const output = isCompleted
      ? {
          recommendation: aiRec?.recommendation || (
            anomaly.severity === 'critical'
              ? `Critical ${anomaly.metric} deviation at ${anomaly.site?.name ?? 'site'} (${anomaly.site?.region ?? 'N/A'}): actual=${anomaly.actualValue}, expected=${anomaly.expectedValue}, zScore=${anomaly.zScore.toFixed(2)}. Immediate investigation and remediation required — check recent maintenance activities and configuration changes.`
              : `${anomaly.metric} anomaly detected at ${anomaly.site?.name ?? 'site'}: actual=${anomaly.actualValue} vs expected=${anomaly.expectedValue}. Schedule diagnostic analysis and review neighbor cell configuration.`
          ),
          confidence: aiRec?.confidence ?? (anomaly.severity === 'critical' ? 0.92 : anomaly.severity === 'high' ? 0.85 : 0.78),
        }
      : null;

    return {
      id: `task-${anomaly.id}`,
      agentId: assignedAgent.id,
      agentName: assignedAgent.name,
      type: isCompleted ? 'root_cause_analysis' : 'anomaly_detection',
      status: isCompleted ? 'completed' : 'running',
      input: {
        site: anomaly.site?.name ?? 'Unknown',
        technology: anomaly.site?.technology ?? anomaly.technology,
        metric: anomaly.metric,
      },
      output,
      latencyMs,
      // Deterministic token counts based on output length
      tokensUsed: isCompleted ? 2000 + (output?.recommendation?.length ?? 50) * 3 : 500 + idx * 200,
      createdAt: anomaly.createdAt.toISOString(),
      completedAt,
    };
  });

  // Derive hourly metrics from aggregate agent stats
  const totalTasks = agents.reduce((s, a) => s + a.tasksCompleted, 0);
  const totalFailed = agents.reduce((s, a) => s + a.tasksFailed, 0);
  const avgLatency = agents.length > 0 ? Math.round(agents.reduce((s, a) => s + a.avgLatencyMs, 0) / agents.length) : 0;
  const hourlyTasks = Math.max(1, Math.round(totalTasks / 24));
  const hourlySuccess = Math.max(1, Math.round((totalTasks - totalFailed) / 24));

  const metrics = Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`,
    tasksTotal: hourlyTasks,
    tasksSuccess: hourlySuccess,
    avgLatency: avgLatency,
    tokensUsed: Math.round(hourlyTasks * (80000 + avgLatency * 40)),
  }));

  const runningTasks = taskQueue.filter(t => t.status === 'running').length;
  const queuedTasks = taskQueue.filter(t => t.status === 'queued').length;

  const summary = {
    totalAgents: agents.length,
    activeAgents: agents.filter(a => a.status === 'active').length,
    totalTasks,
    totalFailed,
    avgSuccessRate: agents.length > 0 ? +(agents.reduce((s, a) => s + a.successRate, 0) / agents.length).toFixed(1) : 0,
    runningTasks,
    queuedTasks,
    totalTokens24h: metrics.reduce((s, m) => s + m.tokensUsed, 0),
  };

  return NextResponse.json({ agents, taskQueue, metrics, chat, summary });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
