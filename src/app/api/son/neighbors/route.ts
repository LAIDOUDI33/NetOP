import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);
  const { searchParams } = new URL(request.url);
  const servingCellId = searchParams.get('servingCellId');
  const technology = searchParams.get('technology');

  try {
    const where: any = {};
    if (servingCellId) where.servingCellId = servingCellId;
    if (technology && technology !== 'ALL') where.technology = technology;

    const neighbors = await db.neighborRelation.findMany({
      where,
      include: {
        servingCell: {
          select: {
            id: true,
            name: true,
            code: true,
            technology: true,
            region: true,
            status: true,
            vendor: true,
            latitude: true,
            longitude: true,
          },
        },
      },
      orderBy: { lastUpdated: 'desc' },
      take: 500,
    });

    return NextResponse.json({
      neighbors: neighbors.map((n) => ({
        id: n.id,
        servingCellId: n.servingCellId,
        servingCell: n.servingCell,
        neighborCellId: n.neighborCellId,
        neighborCellName: n.neighborCellName,
        neighborCellCode: n.neighborCellCode,
        technology: n.technology,
        relationType: n.relationType,
        hoType: n.hoType,
        status: n.status,
        hoSuccessRate: n.hoSuccessRate,
        lastUpdated: n.lastUpdated.toISOString(),
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}