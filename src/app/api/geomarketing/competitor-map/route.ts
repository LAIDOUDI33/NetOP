import { NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const sites = await db.geoCompetitorSite.findMany({
      orderBy: { detectedAt: 'desc' },
      take: 500,
    });

    const mapped = sites.map(s => ({
      id: s.id,
      competitorName: s.competitorName,
      technology: s.technology,
      latitude: s.latitude,
      longitude: s.longitude,
      estimatedRadiusKm: s.estimatedRadiusKm,
      region: s.region,
      confidence: s.confidence,
      source: s.source,
      detectedAt: s.detectedAt.toISOString(),
    }));

    const byCompetitor: Record<string, number> = { Mobilis: 0, Djezzy: 0, Ooredoo: 0 };
    const byTech: Record<string, number> = { '4G': 0, '3G': 0 };
    const byRegion: Record<string, number> = {};

    for (const s of mapped) {
      if (byCompetitor[s.competitorName] !== undefined) {
        byCompetitor[s.competitorName]++;
      } else {
        byCompetitor[s.competitorName] = 1;
      }
      if (byTech[s.technology] !== undefined) {
        byTech[s.technology]++;
      } else {
        byTech[s.technology] = 1;
      }
      byRegion[s.region] = (byRegion[s.region] || 0) + 1;
    }

    const avgConfidence = mapped.length > 0
      ? Number((mapped.reduce((s, site) => s + site.confidence, 0) / mapped.length).toFixed(2))
      : 0;

    return NextResponse.json({
      sites: mapped,
      summary: {
        totalSites: mapped.length,
        byCompetitor,
        byTech,
        avgConfidence,
        byRegion,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
