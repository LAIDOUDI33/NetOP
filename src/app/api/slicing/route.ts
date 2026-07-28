import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const sliceType = searchParams.get('sliceType');

  try {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (sliceType) where.sliceType = sliceType;

    const slices = await db.networkSlice.findMany({
      where,
      include: { site: { select: { name: true, code: true, region: true, technology: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const mapped = slices.map((s) => ({
      id: s.id,
      name: s.name,
      sliceType: s.sliceType,
      technology: s.technology,
      status: s.status,
      siteId: s.siteId,
      siteName: s.site?.name ?? null,
      siteCode: s.site?.code ?? null,
      sst: s.sst,
      sd: s.sd,
      maxBandwidth: s.maxBandwidth,
      guaranteedBw: s.guaranteedBw,
      maxUsers: s.maxUsers,
      priorityLevel: s.priorityLevel,
      latencyTarget: s.latencyTarget,
      reliabilityTarget: s.reliabilityTarget,
      currentLoad: s.currentLoad,
      activeUsers: s.activeUsers,
      avgThroughput: s.avgThroughput,
      avgLatency: s.avgLatency,
      qci: s.qci,
      fiveQi: s.FiveQi,
      parameters: JSON.parse(s.parameters || '{}'),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    const total = slices.length;
    let active = 0;
    let suspended = 0;
    let deactivated = 0;
    const byType: Record<string, number> = {};
    let loadSum = 0;

    for (const s of slices) {
      if (s.status === 'active') active++;
      else if (s.status === 'suspended') suspended++;
      else if (s.status === 'deactivated') deactivated++;
      byType[s.sliceType] = (byType[s.sliceType] || 0) + 1;
      loadSum += s.currentLoad;
    }

    return NextResponse.json({
      slices: mapped,
      summary: {
        total,
        active,
        suspended,
        deactivated,
        byType,
        avgLoad: total > 0 ? Number((loadSum / total).toFixed(1)) : 0,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}