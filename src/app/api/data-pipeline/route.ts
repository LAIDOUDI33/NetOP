import { NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { db } from '@/lib/db';
import { getDemoNow, demoHoursAgo } from '@/lib/demo-time';
import { checkApiAuth, authError } from '@/lib/api-auth';

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

export async function GET(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
  const rows = await db.dataPipeline.findMany({ take: 500 });

  const pipelines = rows.map(r => ({
    id: r.id,
    name: r.name,
    source: r.source,
    target: r.target,
    schedule: r.schedule,
    status: r.status,
    lastRun: r.lastRun?.toISOString() ?? null,
    nextRun: r.nextRun?.toISOString() ?? null,
    recordsProcessed: r.recordsProcessed,
    errorRate: r.errorRate,
    avgDurationMs: r.avgDurationMs,
  }));

  const flowNodes = generateFlowNodes();
  const flowEdges = generateFlowEdges();

  // Static 24h throughput derived from pipeline recordsProcessed
  const totalRecords = pipelines.reduce((s, p) => s + p.recordsProcessed, 0);
  const avgHourlyRecords = pipelines.length > 0 ? Math.round(totalRecords / 24) : 0;
  const avgErrors = pipelines.length > 0 ? Math.round(pipelines.reduce((s, p) => s + p.errorRate, 0) / pipelines.length * avgHourlyRecords / 100) : 0;

  const throughput = Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`,
    ingested: Math.round(avgHourlyRecords * (0.8 + ((i * 7 + 3) % 10) / 25)),
    transformed: Math.round(avgHourlyRecords * (0.75 + ((i * 5 + 1) % 10) / 25)),
    errors: Math.max(5, Math.round(avgErrors * (0.5 + ((i * 3 + 2) % 10) / 20))),
  }));

  const summary = {
    totalPipelines: pipelines.length,
    running: pipelines.filter(p => p.status === 'running').length,
    failed: pipelines.filter(p => p.status === 'failed').length,
    scheduled: pipelines.filter(p => p.status === 'scheduled').length,
    totalRecords24h: totalRecords,
    avgErrorRate: pipelines.length > 0 ? +(pipelines.reduce((s, p) => s + p.errorRate, 0) / pipelines.length).toFixed(2) : 0,
  };

  return NextResponse.json({ pipelines, flowNodes, flowEdges, throughput, summary });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
