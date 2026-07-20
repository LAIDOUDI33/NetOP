import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
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
    });

    const mapped = records.map((r) => ({
      id: r.id,
      servingCellId: r.servingCellId,
      servingCellName: r.servingCell?.name ?? null,
      servingCellCode: r.servingCell?.code ?? null,
      servingCellRegion: r.servingCell?.region ?? null,
      neighborCellName: r.neighborCellName,
      neighborCellCode: r.neighborCellCode,
      technology: r.technology,
      relationType: r.relationType,
      hoAttempts: r.hoAttempts,
      hoSuccess: r.hoSuccess,
      hoFailures: r.hoFailures,
      hoSuccessRate: r.hoSuccessRate,
      avgPrepTime: r.avgPrepTime,
      avgExecTime: r.avgExecTime,
      pingPongCount: r.pingPongCount,
      tooEarlyCount: r.tooEarlyCount,
      tooLateCount: r.tooLateCount,
      status: r.status,
      recommendation: r.recommendation,
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