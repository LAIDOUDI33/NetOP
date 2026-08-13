import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);
  const { searchParams } = new URL(request.url);
  const technology = searchParams.get('technology');
  const category = searchParams.get('category');
  const vendor = searchParams.get('vendor');

  try {
    const where: Record<string, unknown> = {};
    if (technology) where.technology = technology;
    if (category) where.category = category;
    if (vendor) where.vendor = vendor;

    const templates = await db.configTemplate.findMany({
      where,
      orderBy: { applyCount: 'desc' },
      take: 100,
    });

    const mapped = templates.map((t) => ({
      id: t.id,
      name: t.name,
      technology: t.technology,
      category: t.category,
      description: t.description,
      vendor: t.vendor,
      parameters: JSON.parse(t.parameters || '{}'),
      isDefault: t.isDefault,
      applyCount: t.applyCount,
      lastApplied: t.lastApplied?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    const total = templates.length;
    const byCategory: Record<string, number> = {};
    const byTech: Record<string, number> = {};
    let totalApplications = 0;

    for (const t of templates) {
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
      byTech[t.technology] = (byTech[t.technology] || 0) + 1;
      totalApplications += t.applyCount;
    }

    return NextResponse.json({
      templates: mapped,
      summary: {
        total,
        byCategory,
        byTech,
        totalApplications,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}