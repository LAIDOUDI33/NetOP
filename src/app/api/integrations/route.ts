import { NextRequest, NextResponse } from 'next/server';

// ------------------------------------------------------------------
// Data shapes exactly match IntegrationHubView.tsx expectations
// ------------------------------------------------------------------

const integrations = [
  {
    id: 'int-001', name: 'Huawei NMS', type: 'oss' as const,
    status: 'connected' as const, protocol: 'snmp' as const,
    endpoint: 'nms.huawei.djezzy.dz:161', lastSync: '2025-07-25T00:30:00Z',
    dataPoints: 2_458_320, errorRate: 0.02, latencyMs: 45, uptime: 99.8,
  },
  {
    id: 'int-002', name: 'Ericsson OSS-RC', type: 'oss' as const,
    status: 'connected' as const, protocol: 'rest' as const,
    endpoint: 'oss.mobilis.dz:8080/api/v2', lastSync: '2025-07-25T00:28:00Z',
    dataPoints: 1_893_450, errorRate: 0.05, latencyMs: 62, uptime: 99.5,
  },
  {
    id: 'int-003', name: 'Nokia NetAct', type: 'oss' as const,
    status: 'syncing' as const, protocol: 'soap' as const,
    endpoint: 'netact.ooredoo.dz:8443', lastSync: '2025-07-25T00:25:00Z',
    dataPoints: 1_234_567, errorRate: 0.08, latencyMs: 89, uptime: 98.7,
  },
  {
    id: 'int-004', name: 'ZTE U31 NMS', type: 'nms' as const,
    status: 'connected' as const, protocol: 'snmp' as const,
    endpoint: 'nms.zte.djezzy.dz:161', lastSync: '2025-07-25T00:29:00Z',
    dataPoints: 987_654, errorRate: 0.03, latencyMs: 38, uptime: 99.9,
  },
  {
    id: 'int-005', name: 'Siebel CRM', type: 'crm' as const,
    status: 'connected' as const, protocol: 'soap' as const,
    endpoint: 'crm.mobilis.dz:7777/ws', lastSync: '2025-07-25T00:15:00Z',
    dataPoints: 456_789, errorRate: 0.01, latencyMs: 120, uptime: 99.2,
  },
  {
    id: 'int-006', name: 'Salesforce CRM', type: 'crm' as const,
    status: 'connected' as const, protocol: 'rest' as const,
    endpoint: 'api.salesforce.com/services/data/v58', lastSync: '2025-07-25T00:20:00Z',
    dataPoints: 345_678, errorRate: 0.04, latencyMs: 156, uptime: 98.4,
  },
  {
    id: 'int-007', name: 'Amdocs Billing', type: 'billing' as const,
    status: 'connected' as const, protocol: 'rest' as const,
    endpoint: 'billing.djezzy.dz:9090/api', lastSync: '2025-07-25T00:10:00Z',
    dataPoints: 567_890, errorRate: 0.01, latencyMs: 78, uptime: 99.6,
  },
  {
    id: 'int-008', name: 'Comptel Billing', type: 'billing' as const,
    status: 'disconnected' as const, protocol: 'rest' as const,
    endpoint: 'billing.mobilis.dz:9090/api', lastSync: '2025-07-24T18:00:00Z',
    dataPoints: 234_567, errorRate: 0.0, latencyMs: 0, uptime: 85.3,
  },
  {
    id: 'int-009', name: 'JProbe Probe', type: 'probe' as const,
    status: 'connected' as const, protocol: 'ftp' as const,
    endpoint: 'probe.djezzy.dz:21', lastSync: '2025-07-25T00:31:00Z',
    dataPoints: 8_765_432, errorRate: 0.06, latencyMs: 22, uptime: 99.7,
  },
  {
    id: 'int-010', name: 'TEMS Discovery', type: 'ems' as const,
    status: 'error' as const, protocol: 'rest' as const,
    endpoint: 'ems.ooredoo.dz:8080/api', lastSync: '2025-07-24T22:00:00Z',
    dataPoints: 123_456, errorRate: 15.2, latencyMs: 0, uptime: 72.1,
  },
];

const syncHistory = [
  { time: '2025-07-25 00:30', source: 'Huawei NMS', records: 128_450, status: 'success', duration: '45s' },
  { time: '2025-07-25 00:28', source: 'Ericsson OSS-RC', records: 98_230, status: 'success', duration: '62s' },
  { time: '2025-07-25 00:25', source: 'Nokia NetAct', records: 67_890, status: 'partial', duration: '58s' },
  { time: '2025-07-24 22:00', source: 'TEMS Discovery', records: 0, status: 'failed', duration: '120s' },
  { time: '2025-07-25 00:31', source: 'JProbe Probe', records: 456_789, status: 'success', duration: '38s' },
  { time: '2025-07-25 00:15', source: 'Siebel CRM', records: 23_456, status: 'success', duration: '52s' },
  { time: '2025-07-25 00:20', source: 'Salesforce CRM', records: 18_320, status: 'success', duration: '71s' },
  { time: '2025-07-25 00:10', source: 'Amdocs Billing', records: 34_120, status: 'success', duration: '44s' },
  { time: '2025-07-24 18:00', source: 'Comptel Billing', records: 12_450, status: 'failed', duration: '90s' },
  { time: '2025-07-25 00:29', source: 'ZTE U31 NMS', records: 56_780, status: 'success', duration: '33s' },
];

const volumeBySource = [
  { name: 'Huawei NMS', ingested: 2_600_000, processed: 2_458_320, errors: 520 },
  { name: 'Ericsson OSS-RC', ingested: 1_980_000, processed: 1_893_450, errors: 990 },
  { name: 'Nokia NetAct', ingested: 1_300_000, processed: 1_234_567, errors: 1040 },
  { name: 'ZTE U31 NMS', ingested: 1_020_000, processed: 987_654, errors: 306 },
  { name: 'Siebel CRM', ingested: 480_000, processed: 456_789, errors: 48 },
  { name: 'Salesforce CRM', ingested: 360_000, processed: 345_678, errors: 144 },
  { name: 'Amdocs Billing', ingested: 590_000, processed: 567_890, errors: 59 },
  { name: 'JProbe Probe', ingested: 9_200_000, processed: 8_765_432, errors: 5520 },
  { name: 'TEMS Discovery', ingested: 150_000, processed: 123_456, errors: 22_800 },
  { name: 'Comptel Billing', ingested: 250_000, processed: 234_567, errors: 0 },
];

// ------------------------------------------------------------------
// GET handler
// ------------------------------------------------------------------

export async function GET() {
  const connected = integrations.filter(i => i.status === 'connected');
  const errored = integrations.filter(i => i.status === 'error');
  const withLatency = integrations.filter(i => i.latencyMs > 0);

  const summary = {
    total: integrations.length,
    active: connected.length,
    error: errored.length,
    throughput: Math.round(connected.reduce((sum, i) => sum + i.dataPoints, 0) / 3600),
    errorRate: +(integrations.reduce((sum, i) => sum + i.errorRate, 0) / integrations.length).toFixed(2),
    avgLatency: withLatency.length
      ? Math.round(withLatency.reduce((sum, i) => sum + i.latencyMs, 0) / withLatency.length)
      : 0,
  };

  return NextResponse.json({ integrations, summary, syncHistory, volumeBySource });
}

// ------------------------------------------------------------------
// POST handler
// ------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({
      success: true,
      message: 'Integration saved',
      data: { id: `int-${Date.now()}`, ...body, createdAt: new Date().toISOString() },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
}
