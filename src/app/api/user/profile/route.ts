import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkApiAuth, authError } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  try {
    const session = await import('next-auth').then(m => m.getServerSession());
    if (!session?.user) return authError();
    const userId = (session.user as any).id;
    if (!userId) return authError();
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, avatar: true, phone: true, department: true, lastLoginAt: true, createdAt: true, preferences: true },
    });
    if (!user) return authError();
    const roles = await db.userRole.findMany({ where: { userId }, include: { role: { select: { name: true, displayName: true } } } });
    return NextResponse.json({ ...user, roles: roles.map(r => r.role) });
  } catch (error: unknown) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  try {
    const session = await import('next-auth').then(m => m.getServerSession());
    if (!session?.user) return authError();
    const userId = (session.user as any).id;
    if (!userId) return authError();
    const body = await request.json();
    const { name, phone, department, avatar } = body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (department !== undefined) data.department = department;
    if (avatar !== undefined) data.avatar = avatar;
    const user = await db.user.update({ where: { id: userId }, data, select: { id: true, email: true, name: true, avatar: true, phone: true, department: true, lastLoginAt: true, createdAt: true } });
    logAudit({ entityType: 'user_profile', entityId: userId, entityName: user.name, action: 'update', category: 'config', requestedBy: user.name || userId });
    return NextResponse.json(user);
  } catch (error: unknown) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
