import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const users = await db.user.findMany({
      select: { id: true, email: true, name: true, isActive: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const roles = await db.userRole.findMany({
      include: { role: { select: { name: true } } },
      take: 100,
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message, users: [] }, { status: 500 });
  }
}
