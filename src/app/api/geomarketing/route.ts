import { NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { db } from '@/lib/db';
import { getDemoNow } from '@/lib/demo-time';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    await getDemoNow(); // ensure demo time is initialized

    const [demographics, revenueZones, competitorSites] = await Promise.all([
      db.geoDemographic.findMany({ orderBy: { population: 'desc' } }),
      db.geoRevenueZone.findMany({ orderBy: { totalRevenue: 'desc' } }),
      db.geoCompetitorSite.findMany({ orderBy: { detectedAt: 'desc' } }),
    ]);

    const totalPopulation = demographics.reduce((s, d) => s + d.population, 0);
    const avgArpu = revenueZones.length > 0
      ? Math.round(revenueZones.reduce((s, z) => s + z.avgArpu, 0) / revenueZones.length)
      : 0;
    const avgChurnRate = revenueZones.length > 0
      ? Number((revenueZones.reduce((s, z) => s + z.churnRate, 0) / revenueZones.length).toFixed(2))
      : 0;
    const totalCompetitorSites = competitorSites.length;
    const avgMarketPenetration = revenueZones.length > 0
      ? Number((revenueZones.reduce((s, z) => s + z.marketPenetration, 0) / revenueZones.length).toFixed(2))
      : 0;
    const highTierZones = revenueZones.filter(z => z.tier === 'high').length;

    return NextResponse.json({
      demographics: demographics.map(d => ({
        id: d.id,
        region: d.region,
        wilayaCode: d.wilayaCode,
        population: d.population,
        areaKm2: d.areaKm2,
        density: d.density,
        urbanPct: d.urbanPct,
        avgIncome: d.avgIncome,
        youthPct: d.youthPct,
        smartphonePct: d.smartphonePct,
        internetPct: d.internetPct,
        latitude: d.latitude,
        longitude: d.longitude,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
      revenueZones: revenueZones.map(z => ({
        id: z.id,
        region: z.region,
        latitude: z.latitude,
        longitude: z.longitude,
        totalRevenue: z.totalRevenue,
        avgArpu: z.avgArpu,
        subscriberCount: z.subscriberCount,
        churnRate: z.churnRate,
        marketPenetration: z.marketPenetration,
        growthRate: z.growthRate,
        tier: z.tier,
        createdAt: z.createdAt.toISOString(),
        updatedAt: z.updatedAt.toISOString(),
      })),
      competitorSites: competitorSites.map(c => ({
        id: c.id,
        competitorName: c.competitorName,
        technology: c.technology,
        latitude: c.latitude,
        longitude: c.longitude,
        estimatedRadiusKm: c.estimatedRadiusKm,
        region: c.region,
        confidence: c.confidence,
        source: c.source,
        detectedAt: c.detectedAt.toISOString(),
      })),
      summary: {
        totalPopulation,
        avgArpu,
        avgChurnRate,
        totalCompetitorSites,
        avgMarketPenetration,
        highTierZones,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
