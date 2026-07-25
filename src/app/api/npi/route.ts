import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const technology = searchParams.get('technology');
  const region = searchParams.get('region');

  try {
    const where: Record<string, unknown> = {};
    if (technology) where.technology = technology;
    if (region) where.region = region;

    const records = await db.npiRecord.findMany({
      where,
      include: { site: { select: { name: true, code: true, vendor: true } } },
      orderBy: { rank: 'asc' },
    });

    const mapped = records.map((r) => ({
      id: r.id,
      siteId: r.siteId,
      siteName: r.site?.name ?? null,
      siteCode: r.site?.code ?? null,
      vendor: r.site?.vendor ?? null,
      technology: r.technology,
      region: r.region,
      overallNpi: r.overallNpi,
      coverageNpi: r.coverageNpi,
      capacityNpi: r.capacityNpi,
      qualityNpi: r.qualityNpi,
      reliabilityNpi: r.reliabilityNpi,
      costEfficiencyNpi: r.costEfficiencyNpi,
      rank: r.rank,
      totalSites: r.totalSites,
      timestamp: r.timestamp.toISOString(),
      createdAt: r.createdAt.toISOString(),
    }));

    const total = records.length;
    const byTech: Record<string, number> = {};
    const byRegion: Record<string, number> = {};
    let sumOverall = 0;
    let sumCoverage = 0;
    let sumCapacity = 0;
    let sumQuality = 0;
    let sumReliability = 0;
    let sumCostEff = 0;

    for (const r of records) {
      byTech[r.technology] = (byTech[r.technology] || 0) + 1;
      byRegion[r.region] = (byRegion[r.region] || 0) + 1;
      sumOverall += r.overallNpi;
      sumCoverage += r.coverageNpi;
      sumCapacity += r.capacityNpi;
      sumQuality += r.qualityNpi;
      sumReliability += r.reliabilityNpi;
      sumCostEff += r.costEfficiencyNpi;
    }

    return NextResponse.json({
      npis: mapped,
      summary: {
        total,
        avgOverallNpi: total > 0 ? Number((sumOverall / total).toFixed(1)) : 0,
        avgCoverageNpi: total > 0 ? Number((sumCoverage / total).toFixed(1)) : 0,
        avgCapacityNpi: total > 0 ? Number((sumCapacity / total).toFixed(1)) : 0,
        avgQualityNpi: total > 0 ? Number((sumQuality / total).toFixed(1)) : 0,
        avgReliabilityNpi: total > 0 ? Number((sumReliability / total).toFixed(1)) : 0,
        avgCostEfficiencyNpi: total > 0 ? Number((sumCostEff / total).toFixed(1)) : 0,
        byTech,
        byRegion,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}