import { z } from 'zod';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError } from '@/lib/api-auth';

const patchParameterSchema = z.object({
  paramId: z.string().min(1),
  currentValue: z.union([z.string(), z.number()]),
});

export async function GET(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);
  const { searchParams } = new URL(request.url);
  const technology = searchParams.get('technology') || 'all';
  const category = searchParams.get('category') || 'all';

  try {
    const where: any = {};
    if (technology !== 'all') where.technology = technology;
    if (category !== 'all') where.category = category;

    const params = await db.networkParameter.findMany({
      where,
      orderBy: [{ technology: 'asc' }, { category: 'asc' }],
      take: 200,
    });

    return NextResponse.json({
      parameters: params.map(p => ({
        id: p.id,
        technology: p.technology,
        parameter: p.parameter,
        displayName: p.displayName,
        currentValue: p.currentValue,
        unit: p.unit,
        minRange: p.minRange,
        maxRange: p.maxRange,
        description: p.description,
        category: p.category,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);
  try {
    const body = await request.json();
    const parsed = patchParameterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { paramId, currentValue } = parsed.data;
    const param = await db.networkParameter.findUnique({ where: { id: paramId } });
    if (!param) return NextResponse.json({ error: 'Parameter not found' }, { status: 404 });

    const updated = await db.networkParameter.update({
      where: { id: paramId },
      data: { currentValue: String(currentValue) },
    });

    return NextResponse.json({ success: true, parameter: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}