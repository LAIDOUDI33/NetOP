import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const roles = await db.role.findMany({
      include: {
        _count: { select: { users: true, permissions: true } },
      },
      orderBy: { name: 'asc' },
      take: 100,
    });

    const result = roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? '',
      userCount: r._count.users,
      permissionCount: r._count.permissions,
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json({ roles: result });
  } catch {
    return NextResponse.json({ roles: [] }, { status: 500 });
  }
}
