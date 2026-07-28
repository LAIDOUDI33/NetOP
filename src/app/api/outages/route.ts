import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);
  try {
    const { searchParams } = request.nextUrl;
    const technology = searchParams.get('technology');
    const severity = searchParams.get('severity');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (technology) where.technology = technology;
    if (severity) where.severity = severity;
    if (status) where.status = status;

    const outages = await db.outageEvent.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      include: { site: { select: { name: true, code: true } } },
      take: 500,
    });

    const bySeverity: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byOutageType: Record<string, number> = {};
    let activeOutages = 0;
    let totalAffectedUsers = 0;
    let durationSum = 0;
    let durationCount = 0;

    const mapped = outages.map((o) => {
      bySeverity[o.severity] = (bySeverity[o.severity] || 0) + 1;
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
      byOutageType[o.outageType] = (byOutageType[o.outageType] || 0) + 1;
      if (o.status === 'active') activeOutages++;
      totalAffectedUsers += o.affectedUsers;
      if (o.actualDuration != null) { durationSum += o.actualDuration; durationCount++; }

      let compensationSites = [];
      try { compensationSites = JSON.parse(o.compensationSites); } catch { /* keep empty */ }

      return {
        id: o.id,
        siteId: o.siteId,
        siteName: o.site?.name ?? null,
        siteCode: o.site?.code ?? null,
        technology: o.technology,
        region: o.region,
        outageType: o.outageType,
        severity: o.severity,
        status: o.status,
        startedAt: o.startedAt.toISOString(),
        detectedAt: o.detectedAt.toISOString(),
        estimatedDuration: o.estimatedDuration,
        actualDuration: o.actualDuration,
        affectedUsers: o.affectedUsers,
        rootCause: o.rootCause,
        compensationApplied: o.compensationApplied,
        compensationSites,
        resolvedAt: o.resolvedAt?.toISOString() ?? null,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({
      outages: mapped,
      summary: {
        total: mapped.length,
        bySeverity,
        byStatus,
        byOutageType,
        activeOutages,
        totalAffectedUsers,
        avgDuration: durationCount > 0 ? Math.round(durationSum / durationCount) : 0,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}