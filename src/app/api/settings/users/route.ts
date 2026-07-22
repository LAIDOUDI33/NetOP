import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkApiAuth } from '@/lib/api-auth';

export async function GET() {
  const auth = checkApiAuth();
  if (auth) return auth;

  try {
    const users = await db.user.findMany({
      select: { id: true, email: true, name: true, active: true, createdAt: true },
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
      roles: roleMap.get(u.id) ?? [],
    }));

    return NextResponse.json({ users: result });
  } catch {
    return NextResponse.json({ users: [] }, { status: 500 });
  }
}
