import { NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { db } from '@/lib/db';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
  const [neRows, faultRows] = await Promise.all([
    db.ossNetworkElement.findMany({ take: 500 }),
    db.ossFaultEvent.findMany({ take: 100, orderBy: { timestamp: 'desc' } }),
  ]);

  // Map NE rows to match mock response shape (siteName → site)
  const elements = neRows.map(ne => ({
    neId: ne.neId,
    name: ne.name,
    type: ne.type,
    technology: ne.technology,
    vendor: ne.vendor,
    region: ne.region,
    site: ne.siteName,
    status: ne.status,
    lastPoll: ne.lastPoll.toISOString(),
    cpuUsage: ne.cpuUsage,
    memoryUsage: ne.memoryUsage,
    carriers: ne.carriers,
  }));

  // Map fault events (faultId → id)
  const faultEvents = faultRows.map(f => ({
    id: f.faultId,
    neId: f.neId,
    neName: f.neName,
    severity: f.severity,
    description: f.description,
    category: f.category,
    timestamp: f.timestamp.toISOString(),
    acknowledged: f.acknowledged,
  }));

  // Aggregations for charts
  const typeMap: Record<string, number> = {};
  const vendorMap: Record<string, number> = {};
  for (const ne of elements) {
    typeMap[ne.type] = (typeMap[ne.type] || 0) + 1;
    vendorMap[ne.vendor] = (vendorMap[ne.vendor] || 0) + 1;
  }
  const neTypeDistribution = Object.entries(typeMap).map(([name, value]) => ({ name, value }));
  const vendorDistribution = Object.entries(vendorMap).map(([name, count]) => ({ name, count }));

  // Static 24h performance trend
  const avgCpu = elements.length > 0 ? Math.round(elements.reduce((s, n) => s + n.cpuUsage, 0) / elements.length) : 45;
  const avgMem = elements.length > 0 ? Math.round(elements.reduce((s, n) => s + n.memoryUsage, 0) / elements.length) : 55;
  const performanceTrend = Array.from({ length: 24 }, (_, i) => ({
    time: `${String(i).padStart(2, '0')}:00`,
    cpu: avgCpu + Math.round(((i * 7 + 3) % 20) - 10),
    memory: avgMem + Math.round(((i * 5 + 1) % 16) - 8),
    throughput: 350 + Math.round(((i * 11 + 7) % 30) - 15),
  }));

  const summary = {
    total: elements.length,
    active: elements.filter(n => n.status === 'active').length,
    degraded: elements.filter(n => n.status === 'degraded').length,
    down: elements.filter(n => n.status === 'down').length,
    avgCpu: elements.length > 0 ? Math.round(elements.reduce((s, n) => s + n.cpuUsage, 0) / elements.length) : 0,
    avgMemory: elements.length > 0 ? Math.round(elements.reduce((s, n) => s + n.memoryUsage, 0) / elements.length) : 0,
  };

  return NextResponse.json({ elements, neTypeDistribution, vendorDistribution, performanceTrend, faultEvents, summary });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
