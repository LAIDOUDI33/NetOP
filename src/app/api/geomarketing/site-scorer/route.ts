import { NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { db } from '@/lib/db';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const sites = await db.geoSiteAcquisition.findMany({
      orderBy: { overallScore: 'desc' },
      take: 500,
    });

    const mapped = sites.map(s => ({
      id: s.id,
      siteName: s.siteName,
      region: s.region,
      latitude: s.latitude,
      longitude: s.longitude,
      overallScore: s.overallScore,
      demandScore: s.demandScore,
      competitiveScore: s.competitiveScore,
      demographicScore: s.demographicScore,
      coverageScore: s.coverageScore,
      financialScore: s.financialScore,
      estimatedROI: s.estimatedROI,
      capexEstimate: s.capexEstimate,
      opexAnnual: s.opexAnnual,
      paybackMonths: s.paybackMonths,
      recommendation: s.recommendation,
      techPriority: s.techPriority,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    const avgScore = mapped.length > 0
      ? Number((mapped.reduce((s, site) => s + site.overallScore, 0) / mapped.length).toFixed(2))
      : 0;
    const deployCount = mapped.filter(s => s.recommendation === 'deploy').length;
    const reviewCount = mapped.filter(s => s.recommendation === 'review').length;
    const deferCount = mapped.filter(s => s.recommendation === 'defer').length;
    const avgROI = mapped.length > 0
      ? Number((mapped.reduce((s, site) => s + site.estimatedROI, 0) / mapped.length).toFixed(2))
      : 0;
    const totalCapex = mapped.reduce((s, site) => s + site.capexEstimate, 0);
    const avgPayback = mapped.length > 0
      ? Number((mapped.reduce((s, site) => s + site.paybackMonths, 0) / mapped.length).toFixed(1))
      : 0;

    return NextResponse.json({
      sites: mapped,
      summary: {
        totalSites: mapped.length,
        avgScore,
        deployCount,
        reviewCount,
        deferCount,
        avgROI,
        totalCapex,
        avgPayback,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
