import { NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { db } from '@/lib/db';
import type { Locale } from '@/lib/i18n';

export async function GET(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 200 });
  if (limited) return rateLimitResponse(resetMs);

  const { searchParams } = new URL(request.url);
  const __locale = (searchParams.get('locale') ?? 'fr') as Locale;

  try {
    const profiles = await db.wilayaProfile.findMany({
      select: {
        wilayaCode: true,
        wilayaName: true,
        cluster: true,
        population: true,
        compositeScore: true,
      },
      orderBy: [{ cluster: 'asc' }, { clusterOrder: 'asc' }],
      distinct: ['wilayaCode'],
    });

    // Deduplicate by wilayaCode (take first period)
    const seen = new Set<string>();
    const wilayas: Array<{
      code: string;
      name: string;
      cluster: string;
      population: number;
      score: number;
    }> = [];
    for (const p of profiles) {
      if (seen.has(p.wilayaCode)) continue;
      seen.add(p.wilayaCode);
      wilayas.push({
        code: p.wilayaCode,
        name: p.wilayaName,
        cluster: p.cluster,
        population: p.population,
        score: p.compositeScore,
      });
    }

    // Extract unique clusters with counts
    const clusterMap = new Map<string, { count: number; totalPop: number }>();
    for (const w of wilayas) {
      const c = clusterMap.get(w.cluster) ?? { count: 0, totalPop: 0 };
      c.count++;
      c.totalPop += w.population;
      clusterMap.set(w.cluster, c);
    }
    const clusters = Array.from(clusterMap.entries()).map(([name, data]) => ({
      name,
      wilayaCount: data.count,
      totalPopulation: data.totalPop,
    }));

    return NextResponse.json({ wilayas, clusters });
  } catch (error: unknown) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
