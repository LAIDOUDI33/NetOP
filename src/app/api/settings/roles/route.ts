import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: Request) {
  const auth = await checkApiAuth(request);
  if (!auth) return authError();

  try {
    const roles = await db.role.findMany({
      include: {
        _count: { select: { users: true, permissions: true } },
      },
      orderBy: { name: 'asc' },
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
