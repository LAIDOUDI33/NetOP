import { NextResponse } from 'next/server';
import { checkApiAuth, authError } from '@/lib/api-auth';
import { scanCriticalAlerts, scanActiveOutages, scanPendingChanges, scanSlaCompliance } from '@/lib/notification-triggers';

export async function POST(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const body = await request.json().catch(() => ({}));
  const scanners = body.scanners as string[] | undefined;

  const results: Record<string, number> = {};

  try {
    if (!scanners || scanners.includes('critical_alerts')) {
      results.criticalAlerts = await scanCriticalAlerts();
    }
    if (!scanners || scanners.includes('active_outages')) {
      results.activeOutages = await scanActiveOutages();
    }
    if (!scanners || scanners.includes('pending_changes')) {
      results.pendingChanges = await scanPendingChanges();
    }
    if (!scanners || scanners.includes('sla_compliance')) {
      results.slaCompliance = await scanSlaCompliance();
    }
  } catch (error) {
    console.error('Trigger scan error:', error);
  }

  return NextResponse.json({
    success: true,
    scannedAt: new Date().toISOString(),
    results,
  });
}
