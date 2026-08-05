import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [totalScenarios, scenarios] = await Promise.all([
      db.digitalTwinScenario.count(),
      db.digitalTwinScenario.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true, name: true, scenarioType: true, status: true,
          impactScore: true, createdAt: true,
        },
      }),
    ]);

    const byTypeRaw = await db.digitalTwinScenario.groupBy({
      by: ['scenarioType'],
      _count: { id: true },
    });
    const byType: Record<string, number> = {};
    for (const r of byTypeRaw) byType[r.scenarioType] = r._count.id;

    const byStatusRaw = await db.digitalTwinScenario.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    const byStatus: Record<string, number> = {};
    for (const r of byStatusRaw) byStatus[r.status] = r._count.id;

    const avgAgg = await db.digitalTwinScenario.aggregate({
      _avg: { impactScore: true },
    });

    return NextResponse.json({
      totalScenarios,
      byType,
      byStatus,
      avgImpactScore: avgAgg._avg.impactScore ?? 0,
      recentScenarios: scenarios.map(s => ({
        id: s.id,
        name: s.name,
        type: s.scenarioType,
        status: s.status,
        impactScore: s.impactScore,
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    console.error('[DT Dashboard GET]', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
