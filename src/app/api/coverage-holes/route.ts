import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const authed = await checkApiAuth(request);
  if (!authed) return authError();
  try {
    const { searchParams } = request.nextUrl;
    const technology = searchParams.get('technology');
    const severity = searchParams.get('severity');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (technology) where.technology = technology;
    if (severity) where.severity = severity;
    if (status) where.status = status;

    const holes = await db.coverageHole.findMany({ where, orderBy: { createdAt: 'desc' } });

    const bySeverity: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byRegion: Record<string, number> = {};
    let totalAffectedUsers = 0;
    let gapDbSum = 0;

    const mapped = holes.map((h) => {
      bySeverity[h.severity] = (bySeverity[h.severity] || 0) + 1;
      byStatus[h.status] = (byStatus[h.status] || 0) + 1;
      byRegion[h.region] = (byRegion[h.region] || 0) + 1;
      totalAffectedUsers += h.affectedUsers;
      gapDbSum += h.gapDb;

      return {
        id: h.id,
        technology: h.technology,
        region: h.region,
        latitude: h.latitude,
        longitude: h.longitude,
        radiusMeters: h.radiusMeters,
        areaKm2: h.areaKm2,
        signalStrength: h.signalStrength,
        expectedSignal: h.expectedSignal,
        gapDb: h.gapDb,
        severity: h.severity,
        nearestSite: h.nearestSite,
        nearestSiteName: h.nearestSiteName,
        nearestSiteDistKm: h.nearestSiteDistKm,
        affectedUsers: h.affectedUsers,
        recommendation: h.recommendation,
        status: h.status,
        createdAt: h.createdAt.toISOString(),
        updatedAt: h.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({
      holes: mapped,
      summary: {
        total: mapped.length,
        bySeverity,
        byStatus,
        byRegion,
        totalAffectedUsers,
        avgGapDb: mapped.length > 0 ? Number((gapDbSum / mapped.length).toFixed(2)) : 0,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}