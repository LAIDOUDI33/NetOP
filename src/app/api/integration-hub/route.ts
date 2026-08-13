import { NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { db } from '@/lib/db';
import { getDemoNow, demoHoursAgo } from '@/lib/demo-time';
import { checkApiAuth, authError } from '@/lib/api-auth';

function generateHealthTimeline() {
  return Array.from({ length: 48 }, (_, i) => {
    const hourAgo = 48 - i;
    const seed = (hourAgo * 7 + 3) % 100;
    const isDown = (hourAgo === 38 || hourAgo === 15);
    const isDegraded = (hourAgo === 27 || hourAgo === 8);
    return {
      label: `${hourAgo}h`,
      oss: isDown ? 0 : isDegraded ? 85 : 100,
      crm: isDown ? 0 : 100,
      billing: isDown ? 0 : 100,
      son: isDown ? 40 : isDegraded ? 90 : 100,
      nms: isDegraded ? 75 : isDown ? 30 : 100,
    };
  });
}

export async function GET(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
  const now = await getDemoNow();
  const rows = await db.externalIntegration.findMany({ take: 500 });

  const integrations = rows.map(r => ({
    id: r.id,
    name: r.name,
    type: r.type,
    vendor: r.vendor,
    protocol: r.protocol,
    endpoint: r.endpoint,
    status: r.status,
    lastSync: r.lastSync.toISOString(),
    syncIntervalMin: r.syncIntervalMin,
    totalSyncs: r.totalSyncs,
    failedSyncs: r.failedSyncs,
    dataPoints: r.dataPoints,
    latencyMs: r.latencyMs,
    version: r.version,
  }));

  // Generate 20 sync history entries from integration data (transient, not DB-stored)
  const syncHistory = Array.from({ length: 20 }, (_, i) => {
    const int = integrations[i % Math.max(integrations.length, 1)];
    const seed = (i * 13 + 7) % 100;
    const success = seed > 8;
    return {
      id: `SYNC-${String(i + 1).padStart(5, '0')}`,
      integrationId: int?.id ?? '',
      integrationName: int?.name ?? '',
      type: int?.type ?? '',
      status: success ? 'success' : 'failed',
      recordsProcessed: success ? Math.round(100 + (seed * 50)) : 0,
      durationMs: Math.round(200 + (seed * 80)),
      error: success ? null : 'Connection timeout',
      timestamp: new Date(now.getTime() - (i * 2592000 + seed * 86400)).toISOString(),
    };
  });

  const healthTimeline = generateHealthTimeline();

  const summary = {
    totalIntegrations: integrations.length,
    connected: integrations.filter(i => i.status === 'connected' || i.status === 'active').length,
    degraded: integrations.filter(i => i.status === 'degraded').length,
    disconnected: integrations.filter(i => i.status === 'disconnected').length,
    totalDataPoints: integrations.reduce((s, i) => s + i.dataPoints, 0),
    totalSyncs24h: integrations.reduce((s, i) => s + Math.round(i.totalSyncs / 30), 0),
    avgLatency: integrations.length > 0 ? Math.round(integrations.reduce((s, i) => s + i.latencyMs, 0) / integrations.length) : 0,
  };

  return NextResponse.json({ integrations, syncHistory, healthTimeline, summary });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
