import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: Request) {
  const auth = await checkApiAuth(request);
  if (!auth) return authError();

  try {
    const users = await db.user.findMany({
      select: { id: true, email: true, name: true, isActive: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
    });
    const roles = await db.userRole.findMany({
      include: { role: { select: { name: true } } },
    });

    const roleMap = new Map<string, string[]>();
    for (const ur of roles) {
      const existing = roleMap.get(ur.userId) ?? [];
      existing.push(ur.role.name);
      roleMap.set(ur.userId, existing);
    }

    const result = users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      roles: roleMap.get(u.id) ?? [],
    }));

    return NextResponse.json({ users: result });
  } catch {
    return NextResponse.json({ users: [] }, { status: 500 });
  }
}
