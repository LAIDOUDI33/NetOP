import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);
  const { searchParams } = new URL(request.url);
  const sourceTech = searchParams.get('sourceTech');
  const targetTech = searchParams.get('targetTech');
  const status = searchParams.get('status');

  try {
    const where: Record<string, unknown> = {};
    if (sourceTech) where.sourceTech = sourceTech;
    if (targetTech) where.targetTech = targetTech;
    if (status) where.status = status;

    const records = await db.evolutionPlan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const mapped = records.map((r) => ({
      id: r.id,
      name: r.name,
      sourceTech: r.sourceTech,
      targetTech: r.targetTech,
      region: r.region,
      siteCount: r.siteCount,
      sitesCompleted: r.sitesCompleted,
      estimatedCost: r.estimatedCost,
      spentBudget: r.spentBudget,
      startDate: r.startDate?.toISOString() ?? null,
      targetDate: r.targetDate?.toISOString() ?? null,
      status: r.status,
      spectrumGain: JSON.parse(r.spectrumGain),
      capacityGain: JSON.parse(r.capacityGain),
      riskLevel: r.riskLevel,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    const total = records.length;
    const totalSites = records.reduce((s, r) => s + r.siteCount, 0);
    const totalCompleted = records.reduce((s, r) => s + r.sitesCompleted, 0);
    const totalBudget = records.reduce((s, r) => s + r.estimatedCost, 0);
    const totalSpent = records.reduce((s, r) => s + r.spentBudget, 0);
    const bySourceTech: Record<string, number> = {};
    const byTargetTech: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const r of records) {
      bySourceTech[r.sourceTech] = (bySourceTech[r.sourceTech] || 0) + 1;
      byTargetTech[r.targetTech] = (byTargetTech[r.targetTech] || 0) + 1;
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    }

    return NextResponse.json({
      plans: mapped,
      summary: {
        total,
        totalSites,
        totalCompleted,
        completionPct: totalSites > 0 ? Number(((totalCompleted / totalSites) * 100).toFixed(1)) : 0,
        totalBudget,
        totalSpent,
        budgetUtilPct: totalBudget > 0 ? Number(((totalSpent / totalBudget) * 100).toFixed(1)) : 0,
        bySourceTech,
        byTargetTech,
        byStatus,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}