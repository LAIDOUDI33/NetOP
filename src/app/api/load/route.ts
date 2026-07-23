import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const authed = await checkApiAuth(request);
  if (!authed) return authError();
  const { searchParams } = new URL(request.url);
  const technology = searchParams.get('technology');
  const region = searchParams.get('region');
  const congestionLevel = searchParams.get('congestionLevel');

  try {
    const where: Record<string, unknown> = {};
    if (technology) where.technology = technology;
    if (region) where.region = region;
    if (congestionLevel) where.congestionLevel = congestionLevel;

    const records = await db.cellLoad.findMany({
      where,
      include: { site: { select: { name: true, code: true } } },
      orderBy: { timestamp: 'desc' },
    });

    const mapped = records.map((r) => ({
      id: r.id,
      siteId: r.siteId,
      siteName: r.site?.name ?? null,
      siteCode: r.site?.code ?? null,
      technology: r.technology,
      region: r.region,
      prbUtilDownlink: r.prbUtilDownlink,
      prbUtilUplink: r.prbUtilUplink,
      activeUsers: r.activeUsers,
      maxUsers: r.maxUsers,
      userLoadPct: r.userLoadPct,
      throughputDown: r.throughputDown,
      throughputUp: r.throughputUp,
      balancedScore: r.balancedScore,
      congestionLevel: r.congestionLevel,
      recommendation: r.recommendation,
      timestamp: r.timestamp.toISOString(),
      createdAt: r.createdAt.toISOString(),
    }));

    const total = records.length;
    const byCongestion: Record<string, number> = {};
    let prbDownSum = 0;
    let prbUpSum = 0;
    let userLoadSum = 0;
    let totalUsers = 0;
    let congestedSites = 0;

    for (const r of records) {
      byCongestion[r.congestionLevel] = (byCongestion[r.congestionLevel] || 0) + 1;
      prbDownSum += r.prbUtilDownlink;
      prbUpSum += r.prbUtilUplink;
      userLoadSum += r.userLoadPct;
      totalUsers += r.activeUsers;
      if (r.congestionLevel === 'high' || r.congestionLevel === 'critical') congestedSites++;
    }

    return NextResponse.json({
      loads: mapped,
      summary: {
        total,
        avgPrbDown: total > 0 ? Number((prbDownSum / total).toFixed(2)) : 0,
        avgPrbUp: total > 0 ? Number((prbUpSum / total).toFixed(2)) : 0,
        avgUserLoad: total > 0 ? Number((userLoadSum / total).toFixed(2)) : 0,
        byCongestion,
        totalUsers,
        congestedSites,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}