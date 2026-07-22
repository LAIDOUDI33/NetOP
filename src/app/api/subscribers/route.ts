import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const _auth = await checkApiAuth(request);
  if (!_auth) return authError();
  const technology = searchParams.get('technology');

  try {
    const where: Record<string, unknown> = {};
    if (technology) where.technology = technology;

    const segments = await db.subscriberSegment.findMany({
      where,
      orderBy: { subscriberCount: 'desc' },
    });

    const mapped = segments.map((s) => ({
      id: s.id,
      segmentName: s.segmentName,
      technology: s.technology,
      criteria: JSON.parse(s.criteria || '{}'),
      subscriberCount: s.subscriberCount,
      avgDataUsage: s.avgDataUsage,
      avgVoiceMinutes: s.avgVoiceMinutes,
      arpu: s.arpu,
      churnRisk: s.churnRisk,
      satisfactionScore: s.satisfactionScore,
      topServices: JSON.parse(s.topServices || '[]'),
      peakHour: s.peakHour,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    const totalSegments = segments.length;
    let totalSubscribers = 0;
    let totalARPU = 0;
    let churnSum = 0;
    const byTech: Record<string, { count: number; subscribers: number; arpu: number }> = {};

    for (const s of segments) {
      totalSubscribers += s.subscriberCount;
      totalARPU += s.arpu * s.subscriberCount;
      churnSum += s.churnRisk;

      if (!byTech[s.technology]) byTech[s.technology] = { count: 0, subscribers: 0, arpu: 0 };
      byTech[s.technology].count++;
      byTech[s.technology].subscribers += s.subscriberCount;
      byTech[s.technology].arpu += s.arpu * s.subscriberCount;
    }

    const byTechSummary: Record<string, number> = {};
    for (const [tech, stats] of Object.entries(byTech)) {
      byTechSummary[tech] = stats.subscribers;
    }

    return NextResponse.json({
      segments: mapped,
      summary: {
        totalSegments,
        totalSubscribers,
        totalARPU: Number(totalARPU.toFixed(2)),
        avgChurnRisk: totalSegments > 0 ? Number((churnSum / totalSegments).toFixed(3)) : 0,
        byTech: byTechSummary,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}