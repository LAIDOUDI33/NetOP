import { NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { db } from '@/lib/db';
import { getDemoNow, demoHoursAgo } from '@/lib/demo-time';

function generateAgentChat() {
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

export async function GET(request: Request) {
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

  // Static empty task queue — tasks are generated dynamically, not stored
  const taskQueue: unknown[] = [];

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

  const chat = generateAgentChat();

  const summary = {
    totalAgents: agents.length,
    activeAgents: agents.filter(a => a.status === 'active').length,
    totalTasks,
    totalFailed,
    avgSuccessRate: agents.length > 0 ? +(agents.reduce((s, a) => s + a.successRate, 0) / agents.length).toFixed(1) : 0,
    runningTasks: 0,
    queuedTasks: 0,
    totalTokens24h: metrics.reduce((s, m) => s + m.tokensUsed, 0),
  };

  return NextResponse.json({ agents, taskQueue, metrics, chat, summary });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
