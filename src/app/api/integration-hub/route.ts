import { NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

const INTEGRATIONS = [
  { id: 'int-oss', name: 'OSS Integration', type: 'oss', vendor: 'Ericsson', protocol: 'REST/SOAP', endpoint: 'https://oss.algtelecom.dz/api/v2', status: 'connected', lastSync: new Date(Date.now() - 180000).toISOString(), syncIntervalMin: 5, totalSyncs: 45230, failedSyncs: 12, dataPoints: 2840000, latencyMs: 450, version: 'v2.4.1' },
  { id: 'int-crm', name: 'CRM Integration', type: 'crm', vendor: 'Salesforce', protocol: 'REST', endpoint: 'https://crm.algtelecom.dz/api/v1', status: 'connected', lastSync: new Date(Date.now() - 600000).toISOString(), syncIntervalMin: 30, totalSyncs: 12800, failedSyncs: 5, dataPoints: 1450000, latencyMs: 1200, version: 'v1.8.0' },
  { id: 'int-billing', name: 'Billing Integration', type: 'billing', vendor: 'Amdocs', protocol: 'REST', endpoint: 'https://billing.algtelecom.dz/api/v1', status: 'connected', lastSync: new Date(Date.now() - 3600000).toISOString(), syncIntervalMin: 120, totalSyncs: 3200, failedSyncs: 2, dataPoints: 890000, latencyMs: 2300, version: 'v3.1.0' },
  { id: 'int-son', name: 'SON Platform', type: 'son', vendor: 'Huawei', protocol: 'NETCONF', endpoint: 'netconf://son.algtelecom.dz:830', status: 'connected', lastSync: new Date(Date.now() - 60000).toISOString(), syncIntervalMin: 1, totalSyncs: 892000, failedSyncs: 45, dataPoints: 5600000, latencyMs: 180, version: 'v5.2.3' },
  { id: 'int-nms', name: 'NMS Gateway', type: 'nms', vendor: 'Nokia', protocol: 'SNMP/REST', endpoint: 'https://nms.algtelecom.dz:8080', status: 'degraded', lastSync: new Date(Date.now() - 7200000).toISOString(), syncIntervalMin: 15, totalSyncs: 23000, failedSyncs: 340, dataPoints: 3200000, latencyMs: 5600, version: 'v4.0.2' },
  { id: 'int-geo', name: 'GIS Platform', type: 'geo', vendor: 'Esri', protocol: 'REST', endpoint: 'https://geo.algtelecom.dz/arcgis', status: 'connected', lastSync: new Date(Date.now() - 86400000).toISOString(), syncIntervalMin: 1440, totalSyncs: 730, failedSyncs: 0, dataPoints: 45000, latencyMs: 890, version: 'v11.2' },
];

const SYNC_HISTORY = Array.from({ length: 20 }, (_, i) => {
  const int = INTEGRATIONS[i % INTEGRATIONS.length];
  const success = Math.random() > 0.08;
  return {
    id: `SYNC-${String(i + 1).padStart(5, '0')}`,
    integrationId: int.id,
    integrationName: int.name,
    type: int.type,
    status: success ? 'success' : 'failed',
    recordsProcessed: success ? Math.round(100 + Math.random() * 5000) : 0,
    durationMs: Math.round(200 + Math.random() * 8000),
    error: success ? null : pick(['Connection timeout', 'Auth token expired', 'Schema validation failed', 'Rate limit exceeded', 'SSL handshake error']),
    timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
  };
});

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function generateHealthTimeline() {
  return Array.from({ length: 48 }, (_, i) => {
    const hourAgo = 48 - i;
    return {
      label: `${hourAgo}h`,
      oss: Math.random() > 0.05 ? 100 : rand(40, 90),
      crm: Math.random() > 0.03 ? 100 : rand(60, 95),
      billing: Math.random() > 0.02 ? 100 : rand(70, 98),
      son: Math.random() > 0.08 ? 100 : rand(50, 95),
      nms: Math.random() > 0.15 ? 100 : rand(30, 85),
    };
  });
}

function rand(min: number, max: number) { return Math.round(min + Math.random() * (max - min)); }

export async function GET(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
  const healthTimeline = generateHealthTimeline();

  const summary = {
    totalIntegrations: INTEGRATIONS.length,
    connected: INTEGRATIONS.filter(i => i.status === 'connected').length,
    degraded: INTEGRATIONS.filter(i => i.status === 'degraded').length,
    disconnected: INTEGRATIONS.filter(i => i.status === 'disconnected').length,
    totalDataPoints: INTEGRATIONS.reduce((s, i) => s + i.dataPoints, 0),
    totalSyncs24h: INTEGRATIONS.reduce((s, i) => s + Math.round(i.totalSyncs / 30), 0),
    avgLatency: Math.round(INTEGRATIONS.reduce((s, i) => s + i.latencyMs, 0) / INTEGRATIONS.length),
  };

  return NextResponse.json({ integrations: INTEGRATIONS, syncHistory, healthTimeline, summary });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
