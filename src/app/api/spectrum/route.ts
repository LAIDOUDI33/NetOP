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
  const band = searchParams.get('band');
  const region = searchParams.get('region');
  const status = searchParams.get('status');

  try {
    const where: Record<string, unknown> = {};
    if (technology) where.technology = technology;
    if (band) where.band = band;
    if (region) where.region = region;
    if (status) where.status = status;

    const records = await db.spectrumBlock.findMany({
      where,
      orderBy: [{ band: 'asc' }, { technology: 'asc' }],
      take: 500,
    });

    const mapped = records.map((r) => ({
      id: r.id,
      band: r.band,
      bandwidth: r.bandwidth,
      technology: r.technology,
      region: r.region,
      channelCount: r.channelCount,
      utilizedChannels: r.utilizedChannels,
      utilizationPct: r.utilizationPct,
      avgInterference: r.avgInterference,
      avgRsrp: r.avgRsrp,
      refarmCandidate: r.refarmCandidate,
      refarmTargetTech: r.refarmTargetTech,
      refarmPotentialSaving: r.refarmPotentialSaving,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    const total = records.length;
    const byBand: Record<string, number> = {};
    const byTech: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const refarmCandidates = records.filter(r => r.refarmCandidate).length;
    const totalBw = records.reduce((s, r) => s + r.bandwidth, 0);
    const avgUtil = total > 0 ? Number((records.reduce((s, r) => s + r.utilizationPct, 0) / total).toFixed(1)) : 0;

    for (const r of records) {
      byBand[r.band] = (byBand[r.band] || 0) + 1;
      byTech[r.technology] = (byTech[r.technology] || 0) + 1;
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    }

    return NextResponse.json({
      items: mapped,
      summary: {
        total,
        byBand,
        byTech,
        byStatus,
        refarmCandidates,
        totalBandwidthMhz: totalBw,
        avgUtilizationPct: avgUtil,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}