import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const _auth = await checkApiAuth(request);
  if (!_auth) return authError();
  const technology = searchParams.get('technology');
  const category = searchParams.get('category');
  const status = searchParams.get('status');

  try {
    const where: Record<string, unknown> = {};
    if (technology) where.technology = technology;
    if (category) where.category = category;
    if (status) where.status = status;

    const records = await db.roiRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const mapped = records.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      technology: r.technology,
      siteId: r.siteId,
      siteName: r.siteName,
      investmentCost: r.investmentCost,
      annualSaving: r.annualSaving,
      paybackMonths: r.paybackMonths,
      roiPercentage: r.roiPercentage,
      status: r.status,
      kpiImpact: JSON.parse(r.kpiImpact),
      period: r.period,
      periodValue: r.periodValue,
      cumulativeSaving: r.cumulativeSaving,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    const total = records.length;
    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byTech: Record<string, number> = {};
    let totalInvestment = 0;
    let totalAnnualSaving = 0;
    let totalCumulativeSaving = 0;

    for (const r of records) {
      byCategory[r.category] = (byCategory[r.category] || 0) + 1;
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      byTech[r.technology] = (byTech[r.technology] || 0) + 1;
      totalInvestment += r.investmentCost;
      totalAnnualSaving += r.annualSaving;
      totalCumulativeSaving += r.cumulativeSaving;
    }

    return NextResponse.json({
      items: mapped,
      summary: {
        total,
        byCategory,
        byStatus,
        byTech,
        totalInvestment,
        totalAnnualSaving,
        totalCumulativeSaving,
        avgRoi: total > 0 ? Number((records.reduce((s, r) => s + r.roiPercentage, 0) / total).toFixed(1)) : 0,
        avgPayback: total > 0 ? Number((records.reduce((s, r) => s + r.paybackMonths, 0) / total).toFixed(0)) : 0,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}