import { NextResponse } from 'next/server';

const sources = [
  { id: 'src-001', name: 'Huawei NMS', type: 'oss' as const, status: 'healthy' as const, recordsPerSec: 12450, latencyMs: 45, errorRate: 0.2, lastSeen: new Date(Date.now() - 5000).toISOString(), bufferSize: 1150, bufferCapacity: 5000, dataQuality: 98.2 },
  { id: 'src-002', name: 'Ericsson OSS-RC', type: 'oss' as const, status: 'healthy' as const, recordsPerSec: 8900, latencyMs: 62, errorRate: 0.5, lastSeen: new Date(Date.now() - 8000).toISOString(), bufferSize: 1020, bufferCapacity: 3000, dataQuality: 97.1 },
  { id: 'src-003', name: 'Nokia NetAct', type: 'nms' as const, status: 'degraded' as const, recordsPerSec: 5600, latencyMs: 89, errorRate: 0.8, lastSeen: new Date(Date.now() - 12000).toISOString(), bufferSize: 1340, bufferCapacity: 2000, dataQuality: 94.5 },
  { id: 'src-004', name: 'Siebel CRM', type: 'crm' as const, status: 'healthy' as const, recordsPerSec: 2100, latencyMs: 120, errorRate: 0.1, lastSeen: new Date(Date.now() - 30000).toISOString(), bufferSize: 120, bufferCapacity: 1000, dataQuality: 99.0 },
  { id: 'src-005', name: 'Salesforce CRM', type: 'crm' as const, status: 'healthy' as const, recordsPerSec: 1800, latencyMs: 156, errorRate: 0.4, lastSeen: new Date(Date.now() - 25000).toISOString(), bufferSize: 40, bufferCapacity: 500, dataQuality: 97.8 },
  { id: 'src-006', name: 'Amdocs Billing', type: 'billing' as const, status: 'healthy' as const, recordsPerSec: 3400, latencyMs: 78, errorRate: 0.1, lastSeen: new Date(Date.now() - 45000).toISOString(), bufferSize: 380, bufferCapacity: 2000, dataQuality: 98.9 },
  { id: 'src-007', name: 'JProbe', type: 'probe' as const, status: 'healthy' as const, recordsPerSec: 45000, latencyMs: 22, errorRate: 0.6, lastSeen: new Date(Date.now() - 2000).toISOString(), bufferSize: 4100, bufferCapacity: 10000, dataQuality: 96.3 },
  { id: 'src-008', name: 'TEMS Discovery', type: 'nms' as const, status: 'down' as const, recordsPerSec: 0, latencyMs: 0, errorRate: 15.2, lastSeen: new Date(Date.now() - 72000000).toISOString(), bufferSize: 0, bufferCapacity: 2000, dataQuality: 0 },
];

const throughputTrend = Array.from({ length: 24 }, (_, i) => {
  const time = `${String(i).padStart(2, '0')}:00`;
  const base = 60000 + Math.sin((i / 24) * Math.PI * 2) * 20000;
  const oss = Math.round(base * 0.45 + Math.random() * 3000);
  const crm = Math.round(base * 0.10 + Math.random() * 500);
  const billing = Math.round(base * 0.12 + Math.random() * 800);
  const nms = Math.round(base * 0.08 + Math.random() * 600);
  return { time, total: oss + crm + billing + nms, oss, crm, billing, nms };
});

const qualityScores = [
  { dimension: 'Completeness', score: 97.2, trend: 'up' as const, description: 'Measures presence of required fields' },
  { dimension: 'Accuracy', score: 95.8, trend: 'stable' as const, description: 'Degree of correct values' },
  { dimension: 'Timeliness', score: 92.4, trend: 'up' as const, description: 'Data freshness and arrival time' },
  { dimension: 'Consistency', score: 94.1, trend: 'down' as const, description: 'Cross-system data alignment' },
  { dimension: 'Uniqueness', score: 99.1, trend: 'stable' as const, description: 'Absence of duplicate records' },
  { dimension: 'Validity', score: 96.5, trend: 'up' as const, description: 'Conformance to defined rules' },
];

const etlJobs = [
  { id: 'etl-001', name: 'KPI Aggregation', source: 'Huawei NMS', target: 'Data Warehouse', status: 'success' as const, duration: '45s', recordsProcessed: 62500, errorCount: 0, lastRun: '3 min ago', schedule: '*/5 * * * *' },
  { id: 'etl-002', name: 'Fault Correlation', source: 'Ericsson OSS-RC', target: 'Fault DB', status: 'success' as const, duration: '23s', recordsProcessed: 17800, errorCount: 2, lastRun: '1 min ago', schedule: '*/2 * * * *' },
  { id: 'etl-003', name: 'CRM Sync', source: 'Siebel CRM', target: 'CDM', status: 'success' as const, duration: '3m', recordsProcessed: 31500, errorCount: 0, lastRun: '10 min ago', schedule: '0 */15 * * *' },
  { id: 'etl-004', name: 'Revenue ETL', source: 'Amdocs Billing', target: 'Revenue DW', status: 'success' as const, duration: '7m', recordsProcessed: 128000, errorCount: 5, lastRun: '1 hour ago', schedule: '0 0 * * *' },
  { id: 'etl-005', name: 'Probe Ingestion', source: 'JProbe', target: 'Raw Lake', status: 'running' as const, duration: '2m', recordsProcessed: 540000, errorCount: 12, lastRun: '5s ago', schedule: 'continuous' },
  { id: 'etl-006', name: 'TEM Processing', source: 'TEMS Discovery', target: 'Analytics DB', status: 'failed' as const, duration: '0s', recordsProcessed: 0, errorCount: 47, lastRun: '20 hours ago', schedule: '*/10 * * * *' },
];

export async function GET() {
  const activeSources = sources.filter(s => s.status !== 'down');
  const avgLatency = Math.round(
    activeSources.reduce((sum, s) => sum + s.latencyMs, 0) / activeSources.length,
  );
  const overallErrorRate = +(sources.reduce((sum, s) => sum + s.errorRate, 0) / sources.length).toFixed(1);
  const totalBufferSize = sources.reduce((sum, s) => sum + s.bufferSize, 0);
  const totalBufferCapacity = sources.reduce((sum, s) => sum + s.bufferCapacity, 0);

  const summary = {
    totalSources: sources.length,
    totalThroughput: sources.reduce((sum, s) => sum + s.recordsPerSec, 0),
    avgLatency,
    errorRate: overallErrorRate,
    healthySources: sources.filter(s => s.status === 'healthy').length,
    degradedSources: sources.filter(s => s.status === 'degraded').length,
    bufferUtilization: Math.round((totalBufferSize / totalBufferCapacity) * 100),
    activeJobs: etlJobs.filter(j => j.status === 'running').length,
    dataQuality: Math.round(qualityScores.reduce((sum, q) => sum + q.score, 0) / qualityScores.length * 10) / 10,
  };

  return NextResponse.json({
    sources,
    etlJobs,
    throughputTrend,
    qualityScores,
    summary,
  });
}
