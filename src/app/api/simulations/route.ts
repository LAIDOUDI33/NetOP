import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);
  const { searchParams } = new URL(request.url);
  const technology = searchParams.get('technology');
  const category = searchParams.get('category');
  const status = searchParams.get('status');

  try {
    const where: Record<string, unknown> = {};
    if (technology) where.technology = technology;
    if (category) where.category = category;
    if (status) where.status = status;

    const records = await db.simulationScenario.findMany({
      where,
      include: { site: { select: { name: true, code: true, technology: true, region: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const mapped = records.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      technology: r.technology,
      region: r.region,
      siteId: r.siteId,
      siteName: r.site?.name ?? null,
      siteCode: r.site?.code ?? null,
      category: r.category,
      parameters: JSON.parse(r.parameters),
      baselineKpis: JSON.parse(r.baselineKpis),
      simulatedKpis: JSON.parse(r.simulatedKpis),
      impactScore: r.impactScore,
      recommendation: r.recommendation,
      confidence: r.confidence,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    const total = records.length;
    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byTech: Record<string, number> = {};
    let avgConfidence = 0;
    let avgImpact = 0;

    for (const r of records) {
      byCategory[r.category] = (byCategory[r.category] || 0) + 1;
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      byTech[r.technology] = (byTech[r.technology] || 0) + 1;
      avgConfidence += r.confidence;
      avgImpact += r.impactScore;
    }

    return NextResponse.json({
      simulations: mapped,
      summary: {
        total,
        byCategory,
        byStatus,
        byTech,
        avgConfidence: total > 0 ? Number((avgConfidence / total).toFixed(2)) : 0,
        avgImpact: total > 0 ? Number((avgImpact / total).toFixed(1)) : 0,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}