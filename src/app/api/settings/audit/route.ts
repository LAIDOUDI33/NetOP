import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkApiAuth } from '@/lib/api-auth';

export async function GET(request: Request) {
  const auth = checkApiAuth();
  if (auth) return auth;

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') ?? '50');

  try {
    const actions = await db.sonAction.findMany({
      take: Math.min(limit, 200),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        actionType: true,
        siteName: true,
        siteCode: true,
        technology: true,
        parameter: true,
        previousValue: true,
        newValue: true,
        reason: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ actions, total: await db.sonAction.count() });
  } catch {
    return NextResponse.json({ actions: [], total: 0 }, { status: 500 });
  }
}
