import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);
  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get('entityType');
  const action = searchParams.get('action');
  const category = searchParams.get('category');
  const technology = searchParams.get('technology');

  try {
    const where: Record<string, unknown> = {};
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;
    if (category) where.category = category;
    if (technology) where.technology = technology;

    const records = await db.auditTrail.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const mapped = records.map((r) => ({
      id: r.id,
      entityType: r.entityType,
      entityId: r.entityId,
      entityName: r.entityName,
      action: r.action,
      field: r.field,
      previousValue: r.previousValue,
      newValue: r.newValue,
      technology: r.technology,
      category: r.category,
      requestedBy: r.requestedBy,
      approvedBy: r.approvedBy,
      impact: r.impact,
      createdAt: r.createdAt.toISOString(),
    }));

    const total = records.length;
    const byEntityType: Record<string, number> = {};
    const byAction: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byTech: Record<string, number> = {};

    for (const r of records) {
      byEntityType[r.entityType] = (byEntityType[r.entityType] || 0) + 1;
      byAction[r.action] = (byAction[r.action] || 0) + 1;
      byCategory[r.category] = (byCategory[r.category] || 0) + 1;
      if (r.technology) byTech[r.technology] = (byTech[r.technology] || 0) + 1;
    }

    return NextResponse.json({
      items: mapped,
      summary: {
        total,
        byEntityType,
        byAction,
        byCategory,
        byTech,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}