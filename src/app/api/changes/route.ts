import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
  const _auth = await checkApiAuth(request);
  if (!_auth) return authError();
    const { searchParams } = request.nextUrl;
    const technology = searchParams.get('technology');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const riskLevel = searchParams.get('riskLevel');

    const where: Record<string, unknown> = {};
    if (technology) where.technology = technology;
    if (status) where.status = status;
    if (category) where.category = category;
    if (riskLevel) where.riskLevel = riskLevel;

    const changes = await db.changeRequest.findMany({ where, orderBy: { createdAt: 'desc' } });

    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byRisk: Record<string, number> = {};
    const riskValues: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
    let riskSum = 0;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let implementedThisWeek = 0;

    const mapped = changes.map((c) => {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      byCategory[c.category] = (byCategory[c.category] || 0) + 1;
      byRisk[c.riskLevel] = (byRisk[c.riskLevel] || 0) + 1;
      riskSum += riskValues[c.riskLevel] || 0;

      if (c.status === 'implemented' && c.createdAt >= sevenDaysAgo) {
        implementedThisWeek++;
      }

      let kpiImpact = {};
      try { kpiImpact = JSON.parse(c.kpiImpact); } catch { /* keep empty */ }

      return {
        id: c.id,
        title: c.title,
        technology: c.technology,
        siteId: c.siteId,
        siteName: c.siteName,
        category: c.category,
        parameter: c.parameter,
        previousValue: c.previousValue,
        proposedValue: c.proposedValue,
        reason: c.reason,
        impact: c.impact,
        riskLevel: c.riskLevel,
        status: c.status,
        requestedBy: c.requestedBy,
        approvedBy: c.approvedBy,
        implementedAt: c.implementedAt?.toISOString() ?? null,
        rollbackReason: c.rollbackReason,
        kpiImpact,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({
      changes: mapped,
      summary: {
        total: mapped.length,
        byStatus,
        byCategory,
        byRisk,
        avgRiskLevel: mapped.length > 0 ? Number((riskSum / mapped.length).toFixed(2)) : 0,
        implementedThisWeek,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}