import { NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  const { searchParams } = new URL(request.url);
  const clusterFilter = searchParams.get('cluster');
  const wilayaFilter = searchParams.get('wilaya');

  try {
    const where: any = {};
    if (clusterFilter) where.cluster = clusterFilter;
    if (wilayaFilter) where.wilayaName = wilayaFilter;

    const profiles = await db.wilayaProfile.findMany({
      where,
      orderBy: [{ cluster: 'asc' }, { clusterOrder: 'asc' }],
    });

    const mapped = profiles.map(p => ({
      id: p.id,
      wilayaCode: p.wilayaCode,
      wilayaName: p.wilayaName,
      cluster: p.cluster,
      clusterOrder: p.clusterOrder,
      latitude: p.latitude,
      longitude: p.longitude,
      population: p.population,
      dairas: p.dairas,
      communes: p.communes,
      superficieKm2: p.superficieKm2,
      densiteHabKm2: p.densiteHabKm2,
      totalSites: p.totalSites,
      activeSites: p.activeSites,
      avgRsrp: p.avgRsrp,
      avgSinr: p.avgSinr,
      avgThroughputDl: p.avgThroughputDl,
      avgAvailability: p.avgAvailability,
      avgDropRate: p.avgDropRate,
      avgLatencyMs: p.avgLatencyMs,
      coveragePercent: p.coveragePercent,
      tech4gSites: p.tech4gSites,
      tech3gSites: p.tech3gSites,
      tech2gSites: p.tech2gSites,
      totalSubscribers: p.totalSubscribers,
      avgArpu: p.avgArpu,
      totalRevenue: Number(p.totalRevenue),
      churnRate: p.churnRate,
      marketPenetration: p.marketPenetration,
      satisfactionScore: p.satisfactionScore,
      revenueAtRisk: Number(p.revenueAtRisk),
      competitorSites: p.competitorSites,
      coverageGaps: p.coverageGaps,
      churnHotspots: p.churnHotspots,
      revenueZones: p.revenueZones,
      youthRatio: p.youthRatio,
      urbanRatio: p.urbanRatio,
      networkScore: p.networkScore,
      commercialScore: p.commercialScore,
      geomarketingScore: p.geomarketingScore,
      compositeScore: p.compositeScore,
      periodMonth: p.periodMonth,
    }));

    // ── Cluster aggregation ────────────────────────────────────
    const clusterMap = new Map<string, typeof mapped>();
    for (const w of mapped) {
      const existing = clusterMap.get(w.cluster);
      if (!existing) {
        clusterMap.set(w.cluster, [w]);
      } else {
        existing.push(w);
      }
    }

    const clusters = Array.from(clusterMap.entries()).map(([name, wilayas]) => {
      const sum = (key: string) =>
        wilayas.reduce((s: number, w: any) => s + (typeof w[key] === 'number' ? w[key] : 0), 0);
      const avg = (key: string) =>
        Number((sum(key) / wilayas.length).toFixed(2));

      return {
        name,
        wilayaCount: wilayas.length,
        totalPopulation: sum('population'),
        totalDairas: sum('dairas'),
        totalCommunes: sum('communes'),
        totalSuperficieKm2: sum('superficieKm2'),
        avgDensite: avg('densiteHabKm2'),
        totalSites: sum('totalSites'),
        activeSites: sum('activeSites'),
        avgRsrp: avg('avgRsrp'),
        avgSinr: avg('avgSinr'),
        avgThroughputDl: avg('avgThroughputDl'),
        avgAvailability: avg('avgAvailability'),
        avgDropRate: avg('avgDropRate'),
        avgLatencyMs: avg('avgLatencyMs'),
        avgCoverage: avg('coveragePercent'),
        tech4gSites: sum('tech4gSites'),
        tech3gSites: sum('tech3gSites'),
        tech2gSites: sum('tech2gSites'),
        totalSubscribers: sum('totalSubscribers'),
        avgArpu: avg('avgArpu'),
        totalRevenue: sum('totalRevenue'),
        avgChurnRate: avg('churnRate'),
        avgMarketPenetration: avg('marketPenetration'),
        avgSatisfaction: avg('satisfactionScore'),
        totalRevenueAtRisk: sum('revenueAtRisk'),
        totalCompetitorSites: sum('competitorSites'),
        totalCoverageGaps: sum('coverageGaps'),
        totalChurnHotspots: sum('churnHotspots'),
        totalRevenueZones: sum('revenueZones'),
        avgYouthRatio: avg('youthRatio'),
        avgUrbanRatio: avg('urbanRatio'),
        networkScore: avg('networkScore'),
        commercialScore: avg('commercialScore'),
        geomarketingScore: avg('geomarketingScore'),
        compositeScore: avg('compositeScore'),
        wilayas: wilayas.map(w => w.wilayaName),
      };
    }).sort((a, b) => b.compositeScore - a.compositeScore);

    // ── Global summary ─────────────────────────────────────────
    const totalWilayas = mapped.length;
    const totalPopulation = mapped.reduce((s, w) => s + w.population, 0);
    const totalDairas = mapped.reduce((s, w) => s + (w as any).dairas, 0);
    const totalCommunes = mapped.reduce((s, w) => s + (w as any).communes, 0);
    const totalSuperficieKm2 = mapped.reduce((s, w) => s + (w as any).superficieKm2, 0);
    const totalSites = mapped.reduce((s, w) => s + w.totalSites, 0);
    const totalSubscribers = mapped.reduce((s, w) => s + w.totalSubscribers, 0);
    const totalRevenue = mapped.reduce((s, w) => s + w.totalRevenue, 0);
    const totalRevenueAtRisk = mapped.reduce((s, w) => s + w.revenueAtRisk, 0);
    const avgNetworkScore = Number((mapped.reduce((s, w) => s + w.networkScore, 0) / totalWilayas).toFixed(1));
    const avgCommercialScore = Number((mapped.reduce((s, w) => s + w.commercialScore, 0) / totalWilayas).toFixed(1));
    const avgGeomarketingScore = Number((mapped.reduce((s, w) => s + w.geomarketingScore, 0) / totalWilayas).toFixed(1));
    const avgCompositeScore = Number((mapped.reduce((s, w) => s + w.compositeScore, 0) / totalWilayas).toFixed(1));
    const avgChurnRate = Number((mapped.reduce((s, w) => s + w.churnRate, 0) / totalWilayas).toFixed(1));
    const avgSatisfaction = Number((mapped.reduce((s, w) => s + w.satisfactionScore, 0) / totalWilayas).toFixed(1));

    const bestWilaya = [...mapped].sort((a, b) => b.compositeScore - a.compositeScore)[0];
    const worstWilaya = [...mapped].sort((a, b) => a.compositeScore - b.compositeScore)[0];

    return NextResponse.json({
      wilayas: mapped,
      clusters,
      summary: {
        totalWilayas,
        totalClusters: clusters.length,
        totalPopulation,
        totalSites,
        totalSubscribers,
        totalRevenue,
        totalRevenueAtRisk,
        avgNetworkScore,
        avgCommercialScore,
        avgGeomarketingScore,
        avgCompositeScore,
        avgChurnRate,
        avgSatisfaction,
        bestWilaya: bestWilaya ? { name: bestWilaya.wilayaName, score: bestWilaya.compositeScore, cluster: bestWilaya.cluster } : null,
        worstWilaya: worstWilaya ? { name: worstWilaya.wilayaName, score: worstWilaya.compositeScore, cluster: worstWilaya.cluster } : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
