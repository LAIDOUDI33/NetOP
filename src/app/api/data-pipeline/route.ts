import { NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

const PIPELINES = [
  { id: 'pipe-kpi-ingest', name: 'KPI Metrics Ingestion', source: 'OSS Poller', target: 'Time-Series DB', schedule: '*/5 * * * *', status: 'running', lastRun: new Date(Date.now() - 120000).toISOString(), nextRun: new Date(Date.now() + 180000).toISOString(), recordsProcessed: 184200, errorRate: 0.02, avgDurationMs: 2300 },
  { id: 'pipe-alarm-stream', name: 'Alarm Stream Processing', source: 'OSS Alarm Feed', target: 'Alert Engine', schedule: 'realtime', status: 'running', lastRun: new Date(Date.now() - 30000).toISOString(), nextRun: null, recordsProcessed: 45600, errorRate: 0.1, avgDurationMs: 120 },
  { id: 'pipe-crm-sync', name: 'CRM Customer Sync', source: 'CRM API', target: 'Subscriber DB', schedule: '0 */2 * * *', status: 'running', lastRun: new Date(Date.now() - 3600000).toISOString(), nextRun: new Date(Date.now() + 3600000).toISOString(), recordsProcessed: 32400, errorRate: 0.05, avgDurationMs: 8500 },
  { id: 'pipe-billing-etl', name: 'Billing ETL', source: 'Billing System', target: 'Revenue DW', schedule: '0 2 * * *', status: 'completed', lastRun: new Date(Date.now() - 28800000).toISOString(), nextRun: new Date(Date.now() + 57600000).toISOString(), recordsProcessed: 12800, errorRate: 0.0, avgDurationMs: 12000 },
  { id: 'pipe-son-actions', name: 'SON Action Logger', source: 'SON Engine', target: 'Audit Trail', schedule: 'realtime', status: 'running', lastRun: new Date(Date.now() - 60000).toISOString(), nextRun: null, recordsProcessed: 8900, errorRate: 0.0, avgDurationMs: 80 },
  { id: 'pipe-forecast-train', name: 'Forecast Model Training', source: 'KPI History', target: 'ML Models', schedule: '0 3 * * 0', status: 'scheduled', lastRun: new Date(Date.now() - 172800000).toISOString(), nextRun: new Date(Date.now() + 432000000).toISOString(), recordsProcessed: 500000, errorRate: 0.5, avgDurationMs: 120000 },
  { id: 'pipe-qoe-compute', name: 'QoE Score Computation', source: 'KPI + CEM Data', target: 'QoE Dashboard', schedule: '*/10 * * * *', status: 'running', lastRun: new Date(Date.now() - 300000).toISOString(), nextRun: new Date(Date.now() + 300000).toISOString(), recordsProcessed: 92000, errorRate: 0.03, avgDurationMs: 4500 },
  { id: 'pipe-anomaly-label', name: 'Anomaly Labeling', source: 'Alert Engine', target: 'ML Training Set', schedule: '0 4 * * *', status: 'failed', lastRun: new Date(Date.now() - 7200000).toISOString(), nextRun: new Date(Date.now() + 7200000).toISOString(), recordsProcessed: 1200, errorRate: 3.2, avgDurationMs: 30000 },
];

function rand(min: number, max: number) { return Math.round(min + Math.random() * (max - min)); }

function generateFlowNodes() {
  return [
    { id: 'n-oss', name: 'OSS Systems', type: 'source', icon: 'Server', x: 80, y: 100, status: 'connected' },
    { id: 'n-crm', name: 'CRM', type: 'source', icon: 'Users', x: 80, y: 280, status: 'connected' },
    { id: 'n-billing', name: 'Billing', type: 'source', icon: 'CreditCard', x: 80, y: 460, status: 'connected' },
    { id: 'n-ingest', name: 'Ingestion Layer', type: 'process', icon: 'ArrowDownToLine', x: 300, y: 190, status: 'running' },
    { id: 'n-transform', name: 'Transform Engine', type: 'process', icon: 'RefreshCw', x: 520, y: 190, status: 'running' },
    { id: 'n-validate', name: 'Quality Gate', type: 'process', icon: 'ShieldCheck', x: 520, y: 380, status: 'running' },
    { id: 'n-timeseries', name: 'Time-Series DB', type: 'target', icon: 'Database', x: 740, y: 100, status: 'connected' },
    { id: 'n-relational', name: 'Operational DB', type: 'target', icon: 'Database', x: 740, y: 280, status: 'connected' },
    { id: 'n-ml', name: 'ML Feature Store', type: 'target', icon: 'Brain', x: 740, y: 460, status: 'connected' },
  ];
}

function generateFlowEdges() {
  return [
    { from: 'n-oss', to: 'n-ingest', throughput: '2.4K/s' },
    { from: 'n-crm', to: 'n-ingest', throughput: '180/s' },
    { from: 'n-billing', to: 'n-ingest', throughput: '50/s' },
    { from: 'n-ingest', to: 'n-transform', throughput: '2.6K/s' },
    { from: 'n-ingest', to: 'n-validate', throughput: '2.6K/s' },
    { from: 'n-transform', to: 'n-timeseries', throughput: '2.6K/s' },
    { from: 'n-transform', to: 'n-relational', throughput: '2.6K/s' },
    { from: 'n-validate', to: 'n-ml', throughput: '2.6K/s' },
  ];
}

function generateThroughput() {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`,
    ingested: rand(80000, 250000),
    transformed: rand(75000, 240000),
    errors: rand(5, 120),
  }));
}

export async function GET(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
  const pipelines = PIPELINES;
  const flowNodes = generateFlowNodes();
  const flowEdges = generateFlowEdges();
  const throughput = generateThroughput();

  const summary = {
    totalPipelines: pipelines.length,
    running: pipelines.filter(p => p.status === 'running').length,
    failed: pipelines.filter(p => p.status === 'failed').length,
    scheduled: pipelines.filter(p => p.status === 'scheduled').length,
    totalRecords24h: pipelines.reduce((s, p) => s + p.recordsProcessed, 0),
    avgErrorRate: +(pipelines.reduce((s, p) => s + p.errorRate, 0) / pipelines.length).toFixed(2),
  };

  return NextResponse.json({ pipelines, flowNodes, flowEdges, throughput, summary });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
