import { NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const demographics = await db.geoDemographic.findMany({
      orderBy: { population: 'desc' },
      take: 500,
    });

    const mapped = demographics.map(d => ({
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
    }));

    const totalPopulation = mapped.reduce((s, d) => s + d.population, 0);
    const totalAreaKm2 = mapped.reduce((s, d) => s + d.areaKm2, 0);
    const avgDensity = mapped.length > 0
      ? Number((mapped.reduce((s, d) => s + d.density, 0) / mapped.length).toFixed(2))
      : 0;
    const avgUrbanPct = mapped.length > 0
      ? Number((mapped.reduce((s, d) => s + d.urbanPct, 0) / mapped.length).toFixed(2))
      : 0;
    const avgYouthPct = mapped.length > 0
      ? Number((mapped.reduce((s, d) => s + d.youthPct, 0) / mapped.length).toFixed(2))
      : 0;
    const avgSmartphonePct = mapped.length > 0
      ? Number((mapped.reduce((s, d) => s + d.smartphonePct, 0) / mapped.length).toFixed(2))
      : 0;
    const avgInternetPct = mapped.length > 0
      ? Number((mapped.reduce((s, d) => s + d.internetPct, 0) / mapped.length).toFixed(2))
      : 0;
    const avgIncome = mapped.length > 0
      ? Math.round(mapped.reduce((s, d) => s + d.avgIncome, 0) / mapped.length)
      : 0;

    return NextResponse.json({
      demographics: mapped,
      summary: {
        totalPopulation,
        avgDensity,
        avgUrbanPct,
        avgYouthPct,
        avgSmartphonePct,
        avgInternetPct,
        avgIncome,
        totalAreaKm2,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
