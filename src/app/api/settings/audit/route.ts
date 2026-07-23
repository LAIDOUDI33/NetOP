import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: Request) {
  const auth = await checkApiAuth(request);
  if (!auth) return authError();

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') ?? '50');

  try {
    const actions = await db.sonAction.findMany({
      take: Math.min(limit, 200),
      orderBy: { createdAt: 'desc' },
      include: {
        site: { select: { name: true, code: true } },
      },
    });

    const mapped = actions.map((a) => ({
      id: a.id,
      actionType: a.actionType,
      siteName: a.site?.name ?? null,
      siteCode: a.site?.code ?? null,
      technology: a.technology,
      parameter: a.parameter,
      previousValue: a.previousValue,
      newValue: a.newValue,
      reason: a.reason,
      status: a.status,
      createdAt: a.createdAt.toISOString(),
    }));

    return NextResponse.json({ actions: mapped, total: await db.sonAction.count() });
  } catch {
    return NextResponse.json({ actions: [], total: 0 }, { status: 500 });
  }
}
