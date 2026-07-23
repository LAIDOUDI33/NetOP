import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const technology = searchParams.get('technology');
  const severity = searchParams.get('severity');
  const status = searchParams.get('status');

  try {
    const where: any = {};
    if (technology && technology !== 'all') where.technology = technology;
    if (severity && severity !== 'all') where.severity = severity;
    if (status && status !== 'all') where.status = status;

    const anomalies = await db.anomalyEvent.findMany({
      where,
      include: { site: { select: { name: true, code: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Statistics
    const allAnomalies = await db.anomalyEvent.findMany({ where });
    const stats = {
      total: allAnomalies.length,
      bySeverity: { critical: 0, major: 0, minor: 0 },
      byStatus: { detected: 0, investigating: 0, resolved: 0, false_positive: 0 },
      byTech: { '2G': 0, '3G': 0, '4G': 0, '5G': 0 },
    };
    for (const a of allAnomalies) {
      if (a.severity in stats.bySeverity) (stats.bySeverity as any)[a.severity]++;
      if (a.status in stats.byStatus) (stats.byStatus as any)[a.status]++;
      if (a.technology in stats.byTech) (stats.byTech as any)[a.technology]++;
    }

    return NextResponse.json({
      anomalies: anomalies.map(a => ({
        id: a.id, siteId: a.siteId, siteName: a.site?.name, siteCode: a.site?.code,
        technology: a.technology, metric: a.metric,
        actualValue: a.actualValue, expectedValue: a.expectedValue, zScore: a.zScore,
        severity: a.severity, status: a.status, description: a.description,
        resolvedAt: a.resolvedAt?.toISOString(), createdAt: a.createdAt.toISOString(),
      })),
      stats,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { anomalyId, status } = await request.json();
    if (!anomalyId || !status) {
      return NextResponse.json({ error: 'Missing anomalyId or status' }, { status: 400 });
    }

    const anomaly = await db.anomalyEvent.findUnique({ where: { id: anomalyId } });
    if (!anomaly) return NextResponse.json({ error: 'Anomaly not found' }, { status: 404 });

    const updated = await db.anomalyEvent.update({
      where: { id: anomalyId },
      data: { status, resolvedAt: status === 'resolved' ? new Date() : undefined },
    });

    await db.auditLog.create({
      data: {
        entityType: 'anomaly', entityId: anomalyId, action: 'update',
        oldValue: anomaly.status, newValue: status,
        description: `Anomaly ${anomalyId} status changed from ${anomaly.status} to ${status}`,
        technology: anomaly.technology,
      },
    });

    return NextResponse.json({ success: true, anomaly: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}