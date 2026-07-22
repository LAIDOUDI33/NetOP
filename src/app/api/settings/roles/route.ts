import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkApiAuth } from '@/lib/api-auth';

export async function GET() {
  const auth = checkApiAuth();
  if (auth) return auth;

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
      createdAt: r.createdAt,
    }));

    return NextResponse.json({ roles: result });
  } catch {
    return NextResponse.json({ roles: [] }, { status: 500 });
  }
}
