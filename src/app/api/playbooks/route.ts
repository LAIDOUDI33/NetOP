import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
  const _auth = await checkApiAuth(request);
  if (!_auth) return authError();
    const { searchParams } = request.nextUrl;
    const category = searchParams.get('category');
    const technology = searchParams.get('technology');

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (technology) where.technology = technology;

    const playbooks = await db.playbook.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });

    const byCategory: Record<string, number> = {};
    let totalSteps = 0;
    let successRateSum = 0;
    let totalUsage = 0;

    const mapped = playbooks.map((p) => {
      byCategory[p.category] = (byCategory[p.category] || 0) + 1;
      totalSteps += p.steps.length;
      successRateSum += p.successRate;
      totalUsage += p.usageCount;

      let tags = [];
      try { tags = JSON.parse(p.tags); } catch { /* keep empty */ }

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        technology: p.technology,
        description: p.description,
        severity: p.severity,
        estimatedTime: p.estimatedTime,
        usageCount: p.usageCount,
        successRate: p.successRate,
        tags,
        enabled: p.enabled,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        steps: p.steps.map((s) => ({
          id: s.id,
          stepNumber: s.stepNumber,
          title: s.title,
          description: s.description,
          action: s.action,
          target: s.target,
          expectedOutcome: s.expectedOutcome,
          isBlocking: s.isBlocking,
          createdAt: s.createdAt.toISOString(),
        })),
      };
    });

    return NextResponse.json({
      playbooks: mapped,
      summary: {
        total: mapped.length,
        byCategory,
        avgSteps: mapped.length > 0 ? Number((totalSteps / mapped.length).toFixed(1)) : 0,
        avgSuccessRate: mapped.length > 0 ? Number((successRateSum / mapped.length).toFixed(4)) : 0,
        totalUsage,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}