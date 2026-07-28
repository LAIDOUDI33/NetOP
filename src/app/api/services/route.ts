import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkApiAuth, authError } from '@/lib/api-auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);
  const authed = await checkApiAuth(request);
  if (!authed) return authError();

  const { searchParams } = new URL(request.url);
  const serviceType = searchParams.get('serviceType');
  const technology = searchParams.get('technology');
  const region = searchParams.get('region');

  try {
    const where: Record<string, unknown> = {};
    if (serviceType) where.serviceType = serviceType;
    if (technology) where.technology = technology;
    if (region) where.region = region;

    const records = await db.serviceOrchestration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const mapped = records.map((r) => ({
      id: r.id,
      serviceName: r.serviceName,
      serviceType: r.serviceType,
      technology: r.technology,
      region: r.region,
      mosScore: r.mosScore,
      latencyMs: r.latencyMs,
      jitterMs: r.jitterMs,
      packetLoss: r.packetLoss,
      throughputMbps: r.throughputMbps,
      availabilityPct: r.availabilityPct,
      userSatisfaction: r.userSatisfaction,
      activeSessions: r.activeSessions,
      kpiViolations: r.kpiViolations,
      slaCompliant: r.slaCompliant,
      issues: JSON.parse(r.issues),
      timestamp: r.timestamp.toISOString(),
      createdAt: r.createdAt.toISOString(),
    }));

    const total = records.length;
    const byServiceType: Record<string, number> = {};
    const byTech: Record<string, number> = {};
    const byRegion: Record<string, number> = {};
    const slaBreaches = records.filter(r => !r.slaCompliant).length;
    let avgMos = 0;
    let avgLatency = 0;
    let avgThroughput = 0;
    let avgAvailability = 0;
    let totalSessions = 0;
    let totalViolations = 0;

    for (const r of records) {
      byServiceType[r.serviceType] = (byServiceType[r.serviceType] || 0) + 1;
      byTech[r.technology] = (byTech[r.technology] || 0) + 1;
      byRegion[r.region] = (byRegion[r.region] || 0) + 1;
      avgMos += (r.mosScore ?? 0);
      avgLatency += (r.latencyMs ?? 0);
      avgThroughput += (r.throughputMbps ?? 0);
      avgAvailability += (r.availabilityPct ?? 0);
      totalSessions += r.activeSessions;
      totalViolations += r.kpiViolations;
    }

    return NextResponse.json({
      services: mapped,
      summary: {
        total,
        byServiceType,
        byTech,
        byRegion,
        slaBreaches,
        slaComplianceRate: total > 0 ? Number((((total - slaBreaches) / total) * 100).toFixed(1)) : 0,
        avgMos: total > 0 ? Number((avgMos / total).toFixed(2)) : 0,
        avgLatency: total > 0 ? Number((avgLatency / total).toFixed(1)) : 0,
        avgThroughput: total > 0 ? Number((avgThroughput / total).toFixed(2)) : 0,
        avgAvailability: total > 0 ? Number((avgAvailability / total).toFixed(2)) : 0,
        totalSessions,
        totalViolations,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
