import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const _auth = await checkApiAuth(request);
  if (!_auth) return authError();
  const technology = searchParams.get('technology') || 'all';
  const category = searchParams.get('category') || 'all';

  try {
    const where: any = {};
    if (technology !== 'all') where.technology = technology;
    if (category !== 'all') where.category = category;

    const params = await db.networkParameter.findMany({
      where,
      orderBy: [{ technology: 'asc' }, { category: 'asc' }],
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
  try {
  const _auth = await checkApiAuth(request);
  if (!_auth) return authError();
    const { paramId, currentValue } = await request.json();
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