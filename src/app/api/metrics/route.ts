import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  const memUsage = process.memoryUsage();
  
  try {
    const [siteCount, alertCount, incidentCount, userCount] = await Promise.all([
      db.networkSite.count(),
      db.alert.count(),
      db.incident.count(),
      db.user.count(),
    ]);
    
    const responseTime = Date.now() - startTime;
    
    const metrics = [
      // Process metrics
      `# HELP netoptima_process_uptime_seconds Application uptime in seconds`,
      `# TYPE netoptima_process_uptime_seconds gauge`,
      `netoptima_process_uptime_seconds ${(process.uptime()).toFixed(2)}`,
      ``,
      `# HELP netoptima_memory_bytes Process memory usage in bytes`,
      `# TYPE netoptima_memory_bytes gauge`,
      `netoptima_memory_bytes{type="rss"} ${memUsage.rss}`,
      `netoptima_memory_bytes{type="heap_used"} ${memUsage.heapUsed}`,
      `netoptima_memory_bytes{type="heap_total"} ${memUsage.heapTotal}`,
      ``,
      // Business metrics
      `# HELP netoptima_sites_total Total network sites`,
      `# TYPE netoptima_sites_total gauge`,
      `netoptima_sites_total ${siteCount}`,
      ``,
      `# HELP netoptima_alerts_active Total active alerts`,
      `# TYPE netoptima_alerts_active gauge`,
      `netoptima_alerts_active ${alertCount}`,
      ``,
      `# HELP netoptima_incidents_total Total incidents`,
      `# TYPE netoptima_incidents_total gauge`,
      `netoptima_incidents_total ${incidentCount}`,
      ``,
      `# HELP netoptima_users_total Total registered users`,
      `# TYPE netoptima_users_total gauge`,
      `netoptima_users_total ${userCount}`,
      ``,
      // Response time
      `# HELP netoptima_metrics_response_ms Time to generate this metrics response`,
      `# TYPE netoptima_metrics_response_ms gauge`,
      `netoptima_metrics_response_ms ${responseTime}`,
    ].join('\n');
    
    return new NextResponse(metrics, {
      headers: { 'Content-Type': 'text/plain; version=0.0.4' },
    });
  } catch (__error: unknown) {
    // Fallback metrics if DB is unavailable
    const fallback = [
      `# HELP netoptima_process_uptime_seconds Application uptime in seconds`,
      `# TYPE netoptima_process_uptime_seconds gauge`,
      `netoptima_process_uptime_seconds ${(process.uptime()).toFixed(2)}`,
      ``,
      `# HELP netoptima_health_status 1=healthy 0=degraded`,
      `# TYPE netoptima_health_status gauge`,
      `netoptima_health_status 0`,
    ].join('\n');
    
    return new NextResponse(fallback, {
      status: 503,
      headers: { 'Content-Type': 'text/plain; version=0.0.4' },
    });
  }
}
