import { NextResponse } from 'next/server';

const agents = [
  { id: 'agent-001', name: 'NetAnalyst Pro', role: 'Network Analyst', icon: 'Network', status: 'processing', tasksCompleted: 1247, avgResponseMs: 2300, accuracy: 94.2, tasksInProgress: 3, lastActivity: new Date(Date.now()-120000).toISOString(), mode: 'closed-loop', specialization: 'KPI analysis, anomaly detection, trend forecasting' },
  { id: 'agent-002', name: 'FaultPredictor', role: 'Fault Predictor', icon: 'ShieldAlert', status: 'idle', tasksCompleted: 892, avgResponseMs: 1800, accuracy: 91.7, tasksInProgress: 0, lastActivity: new Date(Date.now()-450000).toISOString(), mode: 'semi-automated', specialization: 'Predictive maintenance, root cause analysis' },
  { id: 'agent-003', name: 'CustInsight AI', role: 'Customer Insight', icon: 'Users', status: 'processing', tasksCompleted: 2341, avgResponseMs: 3100, accuracy: 89.5, tasksInProgress: 2, lastActivity: new Date(Date.now()-60000).toISOString(), mode: 'open-loop', specialization: 'Churn prediction, sentiment analysis, segmentation' },
  { id: 'agent-004', name: 'RevenueOpt', role: 'Revenue Optimizer', icon: 'TrendingUp', status: 'completed', tasksCompleted: 567, avgResponseMs: 4200, accuracy: 87.3, tasksInProgress: 1, lastActivity: new Date(Date.now()-30000).toISOString(), mode: 'closed-loop', specialization: 'Pricing optimization, ARPU improvement, bundle recommendation' },
  { id: 'agent-005', name: 'CapPlanner', role: 'Capacity Planner', icon: 'BarChart3', status: 'idle', tasksCompleted: 423, avgResponseMs: 5600, accuracy: 92.1, tasksInProgress: 0, lastActivity: new Date(Date.now()-900000).toISOString(), mode: 'semi-automated', specialization: 'Capacity forecasting, site planning, spectrum allocation' },
  { id: 'agent-006', name: 'SecMonitor', role: 'Security Monitor', icon: 'Lock', status: 'processing', tasksCompleted: 3456, avgResponseMs: 800, accuracy: 97.8, tasksInProgress: 5, lastActivity: new Date(Date.now()-10000).toISOString(), mode: 'closed-loop', specialization: 'Threat detection, anomaly alerting, compliance monitoring' },
];

const taskQueue = [
  { id: 'task-001', agentId: 'agent-001', agentName: 'NetAnalyst Pro', description: 'Analyze 4G KPI degradation in Oran region', priority: 'high', status: 'processing', progress: 67, createdAt: new Date(Date.now()-600000).toISOString(), estimatedCompletion: new Date(Date.now()+300000).toISOString() },
  { id: 'task-002', agentId: 'agent-006', agentName: 'SecMonitor', description: 'Investigate anomalous signaling traffic from unknown source', priority: 'critical', status: 'processing', progress: 34, createdAt: new Date(Date.now()-300000).toISOString(), estimatedCompletion: new Date(Date.now()+600000).toISOString() },
  { id: 'task-003', agentId: 'agent-003', agentName: 'CustInsight AI', description: 'Monthly churn risk assessment for Q3 2025', priority: 'medium', status: 'processing', progress: 82, createdAt: new Date(Date.now()-1200000).toISOString(), estimatedCompletion: new Date(Date.now()+120000).toISOString() },
  { id: 'task-004', agentId: 'agent-004', agentName: 'RevenueOpt', description: 'Optimize 5G data bundle pricing for corporate segment', priority: 'high', status: 'queued', progress: 0, createdAt: new Date(Date.now()-60000).toISOString(), estimatedCompletion: null },
  { id: 'task-005', agentId: 'agent-001', agentName: 'NetAnalyst Pro', description: 'Generate weekly network health report', priority: 'low', status: 'processing', progress: 45, createdAt: new Date(Date.now()-900000).toISOString(), estimatedCompletion: new Date(Date.now()+480000).toISOString() },
];

const coordinationEvents = [
  { id: 'coord-001', from: 'SecMonitor', to: 'FaultPredictor', type: 'alert_forward', message: 'Anomalous traffic pattern forwarded for fault analysis', timestamp: new Date(Date.now()-120000).toISOString() },
  { id: 'coord-002', from: 'NetAnalyst Pro', to: 'CapPlanner', type: 'recommendation', message: 'Capacity threshold exceeded in Sétif, request planning analysis', timestamp: new Date(Date.now()-300000).toISOString() },
  { id: 'coord-003', from: 'CustInsight AI', to: 'RevenueOpt', type: 'data_share', message: 'High-value churn risk customers identified for retention offers', timestamp: new Date(Date.now()-600000).toISOString() },
  { id: 'coord-004', from: 'FaultPredictor', to: 'NetAnalyst Pro', type: 'result', message: 'Root cause identified: power supply degradation at site ORA-ENB-003', timestamp: new Date(Date.now()-450000).toISOString() },
];

const decisions = [
  { id: 'dec-001', agentId: 'agent-001', agent: 'NetAnalyst Pro', decision: 'Adjust DL power by -3dB at 12 sites in Oran to reduce interference', confidence: 92, impact: 'high', status: 'approved', timestamp: new Date(Date.now()-1800000).toISOString() },
  { id: 'dec-002', agentId: 'agent-006', agent: 'SecMonitor', decision: 'Block suspicious IP range 185.220.101.0/24 from OSS access', confidence: 98, impact: 'critical', status: 'auto-executed', timestamp: new Date(Date.now()-900000).toISOString() },
  { id: 'dec-003', agentId: 'agent-002', agent: 'FaultPredictor', decision: 'Schedule preventive maintenance for 5 sites with predicted RRU failure within 72h', confidence: 87, impact: 'medium', status: 'pending', timestamp: new Date(Date.now()-600000).toISOString() },
  { id: 'dec-004', agentId: 'agent-004', agent: 'RevenueOpt', decision: 'Launch targeted 5G upgrade offer to 12,000 high-ARPU 4G-only customers', confidence: 85, impact: 'high', status: 'approved', timestamp: new Date(Date.now()-3600000).toISOString() },
];

export async function GET() {
  const summary = { totalAgents: agents.length, activeAgents: agents.filter(a=>a.status==='processing').length, totalTasksCompleted: agents.reduce((s,a)=>s+a.tasksCompleted,0), avgAccuracy: +(agents.reduce((s,a)=>s+a.accuracy,0)/agents.length).toFixed(1), queueSize: taskQueue.filter(t=>t.status==='queued').length, processingNow: taskQueue.filter(t=>t.status==='processing').length, };
  return NextResponse.json({ agents, taskQueue, coordinationEvents, decisions, summary });
}
