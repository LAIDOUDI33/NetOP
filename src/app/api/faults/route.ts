import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const technology = searchParams.get('technology');
  const severity = searchParams.get('severity');
  const status = searchParams.get('status');
  const component = searchParams.get('component');

  try {
    const where: Record<string, unknown> = {};
    if (technology) where.technology = technology;
    if (severity) where.severity = severity;
    if (status) where.status = status;
    if (component) where.component = component;

    const predictions = await db.faultPrediction.findMany({
      where,
      include: { site: { select: { name: true, code: true, region: true, technology: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const mapped = predictions.map((p) => ({
      id: p.id,
      siteId: p.siteId,
      siteName: p.site?.name ?? null,
      siteCode: p.site?.code ?? null,
      technology: p.technology,
      component: p.component,
      faultType: p.faultType,
      probability: p.probability,
      severity: p.severity,
      status: p.status,
      confidence: p.confidence,
      indicators: JSON.parse(p.indicators || '[]'),
      recommendedAction: p.recommendedAction,
      estimatedTimeToFail: p.estimatedTimeToFail,
      resolvedAt: p.resolvedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    const total = predictions.length;
    const bySeverity: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byComponent: Record<string, number> = {};
    let probSum = 0;
    let highRiskCount = 0;

    for (const p of predictions) {
      bySeverity[p.severity] = (bySeverity[p.severity] || 0) + 1;
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
      byComponent[p.component] = (byComponent[p.component] || 0) + 1;
      probSum += p.probability;
      if (p.severity === 'high' || p.severity === 'critical') highRiskCount++;
    }

    return NextResponse.json({
      predictions: mapped,
      summary: {
        total,
        bySeverity,
        byStatus,
        byComponent,
        avgProbability: total > 0 ? Number((probSum / total).toFixed(2)) : 0,
        highRiskCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}