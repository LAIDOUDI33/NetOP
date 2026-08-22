import { z } from 'zod';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError, forbiddenError } from '@/lib/api-auth';
import bcrypt from 'bcrypt';

const createUserSchema = z.object({
  email: z.string().email('Email invalide'),
  name: z.string().min(1, 'Le nom est requis'),
  password: z.string().min(6, '6 caractères minimum'),
  department: z.string().optional(),
  phone: z.string().optional(),
  roleNames: z.array(z.string()).optional(),
});

const patchUserSchema = z.object({
  id: z.string().min(1, 'Identifiant requis'),
  name: z.string().optional(),
  email: z.string().email().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  roleNames: z.array(z.string()).optional(),
});

export async function GET(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const users = await db.user.findMany({
      select: { id: true, email: true, name: true, department: true, phone: true, isActive: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const userRoles = await db.userRole.findMany({
      include: { role: { select: { name: true } } },
      take: 500,
    });
    const roleMap = new Map<string, string[]>();
    for (const ur of userRoles) {
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

// ─── POST — Create user ───────────────────────────────
export async function POST(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);

  try { await checkApiAuth(request); } catch { return authError(); }

  try {
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { email, name, password, department, phone, roleNames } = parsed.data;

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: { email, name, passwordHash, department: department ?? 'NOC', phone: phone ?? '', isActive: true },
    });

    if (roleNames && roleNames.length > 0) {
      const roles = await db.role.findMany({ where: { name: { in: roleNames } } });
      if (roles.length > 0) {
        await db.userRole.createMany({
          data: roles.map((r) => ({ userId: user.id, roleId: r.id })),
          skipDuplicates: true,
        });
      }
    }

    return NextResponse.json({ id: user.id, email: user.email, name: user.name, department: user.department, phone: user.phone, isActive: user.isActive, createdAt: user.createdAt.toISOString(), roles: roleNames ?? [] }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── PATCH — Edit user ────────────────────────────────
export async function PATCH(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);

  try { await checkApiAuth(request); } catch { return authError(); }

  try {
    const body = await request.json();
    const parsed = patchUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { id, name, email, department, phone, isActive, roleNames } = parsed.data;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (department !== undefined) data.department = department;
    if (phone !== undefined) data.phone = phone;
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await db.user.update({ where: { id }, data });

    if (roleNames !== undefined) {
      await db.userRole.deleteMany({ where: { userId: id } });
      if (roleNames.length > 0) {
        const roles = await db.role.findMany({ where: { name: { in: roleNames } } });
        if (roles.length > 0) {
          await db.userRole.createMany({
            data: roles.map((r) => ({ userId: id, roleId: r.id })),
            skipDuplicates: true,
          });
        }
      }
    }

    const finalRoles = roleNames ?? (await db.userRole.findMany({ where: { userId: id }, include: { role: { select: { name: true } } } })).map((ur) => ur.role.name);

    return NextResponse.json({
      id: updated.id, email: updated.email, name: updated.name, department: updated.department, phone: updated.phone, isActive: updated.isActive, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString(), roles: finalRoles,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── DELETE — Soft-deactivate user ────────────────────
export async function DELETE(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);

  try { await checkApiAuth(request); } catch { return authError(); }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Identifiant requis' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    await db.user.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
