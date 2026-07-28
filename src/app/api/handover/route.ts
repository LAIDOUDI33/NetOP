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
  const technology = searchParams.get('technology');
  const status = searchParams.get('status');

  try {
    const where: Record<string, unknown> = {};
    if (technology) where.technology = technology;
    if (status) where.status = status;

    const records = await db.handoverKpi.findMany({
      where,
      include: { servingCell: { select: { name: true, code: true, region: true } } },
      orderBy: { timestamp: 'desc' },
      take: 500,
    });

    const mapped = records.map((r) => ({
      id: r.id,
      servingCellId: r.servingCellId,
      servingCellName: r.servingCell?.name ?? '—',
      servingCellCode: r.servingCell?.code ?? '—',
      servingCellRegion: r.servingCell?.region ?? '—',
      neighborCellName: r.neighborCellName ?? '—',
      neighborCellCode: r.neighborCellCode ?? '—',
      technology: r.technology ?? '—',
      relationType: r.relationType ?? 'unknown',
      hoAttempts: r.hoAttempts ?? 0,
      hoSuccess: r.hoSuccess ?? 0,
      hoFailures: r.hoFailures ?? 0,
      hoSuccessRate: r.hoSuccessRate ?? 0,
      avgPrepTime: r.avgPrepTime ?? 0,
      avgExecTime: r.avgExecTime ?? 0,
      pingPongCount: r.pingPongCount ?? 0,
      tooEarlyCount: r.tooEarlyCount ?? 0,
      tooLateCount: r.tooLateCount ?? 0,
      status: r.status ?? 'unknown',
      recommendation: r.recommendation ?? '—',
      timestamp: r.timestamp.toISOString(),
      createdAt: r.createdAt.toISOString(),
    }));

    const total = records.length;
    const byStatus: Record<string, number> = {};
    const byRelationType: Record<string, number> = {};
    let successRateSum = 0;
    let totalAttempts = 0;
    let totalFailures = 0;
    let pingPongTotal = 0;

    for (const r of records) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      byRelationType[r.relationType] = (byRelationType[r.relationType] || 0) + 1;
      successRateSum += r.hoSuccessRate;
      totalAttempts += r.hoAttempts;
      totalFailures += r.hoFailures;
      pingPongTotal += r.pingPongCount;
    }

    return NextResponse.json({
      handovers: mapped,
      summary: {
        total,
        avgSuccessRate: total > 0 ? Number((successRateSum / total).toFixed(2)) : 0,
        byStatus,
        byRelationType,
        totalAttempts,
        totalFailures,
        pingPongTotal,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}