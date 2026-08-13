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
  const status = searchParams.get('status');
  const metric = searchParams.get('metric');

  try {
    const where: Record<string, unknown> = {};
    if (technology) where.technology = technology;
    if (status) where.status = status;
    if (metric) where.metric = metric;

    const records = await db.benchmarkRecord.findMany({
      where,
      include: { site: { select: { name: true, code: true } } },
      orderBy: { timestamp: 'desc' },
      take: 200,
    });

    const mapped = records.map((r) => ({
      id: r.id,
      siteId: r.siteId,
      siteName: r.site?.name ?? null,
      siteCode: r.site?.code ?? null,
      technology: r.technology,
      region: r.region,
      metric: r.metric,
      actualValue: r.actualValue,
      benchmarkValue: r.benchmarkValue,
      targetValue: r.targetValue,
      percentileRank: r.percentileRank,
      gap: r.gap,
      status: r.status,
      timestamp: r.timestamp.toISOString(),
      createdAt: r.createdAt.toISOString(),
    }));

    const total = records.length;
    const byStatus: Record<string, number> = {};
    const byMetric: Record<string, number> = {};
    let gapSum = 0;
    let aboveTarget = 0;

    for (const r of records) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      byMetric[r.metric] = (byMetric[r.metric] || 0) + 1;
      gapSum += Math.abs(r.gap);
      if (r.actualValue >= r.targetValue) aboveTarget++;
    }

    return NextResponse.json({
      benchmarks: mapped,
      summary: {
        total,
        byStatus,
        byMetric,
        avgGap: total > 0 ? Number((gapSum / total).toFixed(2)) : 0,
        aboveTarget,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}