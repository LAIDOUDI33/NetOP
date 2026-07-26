import { NextResponse } from 'next/server';

const AGENTS = [
  { id: 'agent-optimizer', name: 'Network Optimizer', type: 'optimization', description: 'Autonomous parameter tuning based on KPI targets', model: 'gpt-4o', status: 'active', tasksCompleted: 1847, tasksFailed: 23, avgLatencyMs: 2340, successRate: 98.8 },
  { id: 'agent-anomaly', name: 'Anomaly Detector', type: 'detection', description: 'Real-time anomaly detection across all KPIs', model: 'gpt-4o', status: 'active', tasksCompleted: 3210, tasksFailed: 45, avgLatencyMs: 1200, successRate: 98.6 },
  { id: 'agent-rca', name: 'Root Cause Analyzer', type: 'analysis', description: 'Multi-layer root cause analysis with evidence chain', model: 'gpt-4o', status: 'active', tasksCompleted: 856, tasksFailed: 12, avgLatencyMs: 4500, successRate: 98.6 },
  { id: 'agent-forecast', name: 'Demand Forecaster', type: 'forecasting', description: 'Capacity and traffic demand forecasting', model: 'gpt-4o-mini', status: 'active', tasksCompleted: 2100, tasksFailed: 8, avgLatencyMs: 890, successRate: 99.6 },
  { id: 'agent-son', name: 'SON Coordinator', type: 'automation', description: 'Self-Organizing Network action orchestration', model: 'gpt-4o', status: 'idle', tasksCompleted: 4320, tasksFailed: 67, avgLatencyMs: 3200, successRate: 98.5 },
  { id: 'agent-slicing', name: 'Slice Manager', type: 'orchestration', description: 'Network slice lifecycle management', model: 'gpt-4o', status: 'active', tasksCompleted: 645, tasksFailed: 3, avgLatencyMs: 1800, successRate: 99.5 },
  { id: 'agent-energy', name: 'Energy Advisor', type: 'optimization', description: 'Energy-saving recommendation engine', model: 'gpt-4o-mini', status: 'idle', tasksCompleted: 1580, tasksFailed: 22, avgLatencyMs: 1500, successRate: 98.6 },
];

const TASK_TYPES = ['optimization', 'anomaly_scan', 'rca', 'forecast', 'son_action', 'slice_config', 'energy_audit', 'health_check'];
const STATUSES = ['completed', 'failed', 'running', 'queued', 'cancelled'] as const;

function rand(min: number, max: number) { return Math.round(min + Math.random() * (max - min)); }
function pick<T>(arr: readonly T[] | T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function generateTaskQueue() {
  const queue: any[] = [];
  for (let i = 0; i < 30; i++) {
    const agent = pick(AGENTS);
    const status = pick(STATUSES);
    const created = Date.now() - Math.random() * 86400000;
    queue.push({
      id: `TASK-${String(i + 1).padStart(5, '0')}`,
      agentId: agent.id, agentName: agent.name,
      type: pick(TASK_TYPES),
      status,
      input: { site: `SITE_${rand(1, 200)}`, technology: pick(['4G', '5G']), metric: pick(['RSRP', 'Throughput', 'Latency', 'BLER']) },
      output: status === 'completed' ? { recommendation: `Adjust ${pick(['tilt', 'power', 'PCI', 'frequency'])} by ${rand(1, 6)} dB`, confidence: +(0.7 + Math.random() * 0.28).toFixed(2) } : null,
      latencyMs: status === 'running' ? null : rand(500, 8000),
      tokensUsed: status === 'completed' ? rand(800, 5000) : 0,
      createdAt: new Date(created).toISOString(),
      completedAt: status === 'completed' ? new Date(created + rand(1000, 10000)).toISOString() : null,
    });
  }
  return queue.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function generateAgentMetrics() {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`,
    tasksTotal: rand(20, 80),
    tasksSuccess: rand(18, 78),
    avgLatency: rand(800, 5000),
    tokensUsed: rand(50000, 300000),
  }));
}

function generateAgentChat() {
  return [
    { role: 'system', content: 'You are the NetOP Multi-Agent orchestrator. Coordinate network AI agents.', timestamp: new Date(Date.now() - 3600000).toISOString() },
    { role: 'agent', agentName: 'Anomaly Detector', content: 'Detected 3 new anomalies in Alger region: RSRP degradation on 12 sites, throughput drop on 5 eNodeBs.', timestamp: new Date(Date.now() - 3500000).toISOString() },
    { role: 'orchestrator', content: 'Routing RSRP anomalies to RCA agent. Queuing throughput analysis for Optimizer.', timestamp: new Date(Date.now() - 3400000).toISOString() },
    { role: 'agent', agentName: 'Root Cause Analyzer', content: 'RCA complete for 8/12 sites. Root cause: tilting misalignment after maintenance. Recommended: restore tilt to original values.', timestamp: new Date(Date.now() - 3000000).toISOString() },
    { role: 'orchestrator', content: 'RCA confidence > 95%. Forwarding 8 corrective actions to SON Coordinator for auto-remediation.', timestamp: new Date(Date.now() - 2800000).toISOString() },
    { role: 'agent', agentName: 'SON Coordinator', content: 'Executed 8 tilt corrections. All KPIs returning to baseline. Monitoring for 15 min before closing.', timestamp: new Date(Date.now() - 2400000).toISOString() },
  ];
}

export async function GET() {
  const agents = AGENTS.map(a => ({ ...a, uptime: rand(95, 99.9) }));
  const taskQueue = generateTaskQueue();
  const metrics = generateAgentMetrics();
  const chat = generateAgentChat();

  const summary = {
    totalAgents: agents.length,
    activeAgents: agents.filter(a => a.status === 'active').length,
    totalTasks: agents.reduce((s, a) => s + a.tasksCompleted, 0),
    totalFailed: agents.reduce((s, a) => s + a.tasksFailed, 0),
    avgSuccessRate: +(agents.reduce((s, a) => s + a.successRate, 0) / agents.length).toFixed(1),
    runningTasks: taskQueue.filter(t => t.status === 'running').length,
    queuedTasks: taskQueue.filter(t => t.status === 'queued').length,
    totalTokens24h: metrics.reduce((s, m) => s + m.tokensUsed, 0),
  };

  return NextResponse.json({ agents, taskQueue, metrics, chat, summary });
}
