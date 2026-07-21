import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const technology = searchParams.get('technology');
  const severity = searchParams.get('severity');
  const status = searchParams.get('status');
  const interferenceType = searchParams.get('interferenceType');

  try {
    const where: Record<string, unknown> = {};
    if (technology) where.technology = technology;
    if (severity) where.severity = severity;
    if (status) where.status = status;
    if (interferenceType) where.interferenceType = interferenceType;

    const records = await db.interferenceEvent.findMany({
      where,
      include: { site: { select: { name: true, code: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const mapped = records.map((r) => ({
      id: r.id,
      siteId: r.siteId,
      siteName: r.site?.name ?? null,
      siteCode: r.site?.code ?? null,
      technology: r.technology,
      interferenceType: r.interferenceType,
      severity: r.severity,
      status: r.status,
      sourceCell: r.sourceCell,
      sourceCellName: r.sourceCellName,
      conflictingCell: r.conflictingCell,
      conflictingCellName: r.conflictingCellName,
      frequency: r.frequency,
      pci: r.pci,
      affectedKpis: JSON.parse(r.affectedKpis),
      impactScore: r.impactScore,
      recommendation: r.recommendation,
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    const total = records.length;
    const bySeverity: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let impactSum = 0;

    for (const r of records) {
      bySeverity[r.severity] = (bySeverity[r.severity] || 0) + 1;
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      byType[r.interferenceType] = (byType[r.interferenceType] || 0) + 1;
      impactSum += r.impactScore;
    }

    return NextResponse.json({
      events: mapped,
      summary: {
        total,
        bySeverity,
        byStatus,
        byType,
        avgImpact: total > 0 ? Number((impactSum / total).toFixed(2)) : 0,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}