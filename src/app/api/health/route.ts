import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const technology = searchParams.get('technology');
  const region = searchParams.get('region');
  const grade = searchParams.get('grade');

  try {
    const where: Record<string, unknown> = {};
    if (technology) where.technology = technology;
    if (region) where.region = region;
    if (grade) where.grade = grade;

    const records = await db.healthScore.findMany({
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
      overallScore: r.overallScore,
      coverageScore: r.coverageScore,
      capacityScore: r.capacityScore,
      qualityScore: r.qualityScore,
      reliabilityScore: r.reliabilityScore,
      experienceScore: r.experienceScore,
      grade: r.grade,
      trend: r.trend,
      issues: JSON.parse(r.issues),
      timestamp: r.timestamp.toISOString(),
      createdAt: r.createdAt.toISOString(),
    }));

    const total = records.length;
    const byGrade: Record<string, number> = {};
    const byRegion: Record<string, number> = {};
    const byTrend: Record<string, number> = {};
    let overallSum = 0;

    for (const r of records) {
      byGrade[r.grade] = (byGrade[r.grade] || 0) + 1;
      byRegion[r.region] = (byRegion[r.region] || 0) + 1;
      byTrend[r.trend] = (byTrend[r.trend] || 0) + 1;
      overallSum += r.overallScore;
    }

    return NextResponse.json({
      healthScores: mapped,
      summary: {
        total,
        avgOverall: total > 0 ? Number((overallSum / total).toFixed(2)) : 0,
        byGrade,
        byRegion,
        byTrend,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}