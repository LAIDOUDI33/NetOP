import { z } from 'zod';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError, forbiddenError } from '@/lib/api-auth';

const createRoleSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  displayName: z.string().min(1, "Le nom d'affichage est requis"),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).optional(),
});

const patchRoleSchema = z.object({
  id: z.string().min(1, 'Identifiant requis'),
  displayName: z.string().optional(),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).optional(),
});

export async function GET(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const roles = await db.role.findMany({
      include: { _count: { select: { users: true, permissions: true } } },
      orderBy: { name: 'asc' },
      take: 100,
    });
    const result = roles.map((r) => ({
      id: r.id, name: r.name, displayName: r.displayName, description: r.description ?? '', isSystem: r.isSystem, userCount: r._count.users, permissionCount: r._count.permissions, createdAt: r.createdAt.toISOString(),
    }));
    return NextResponse.json({ roles: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message, roles: [] }, { status: 500 });
  }
}

// ─── POST — Create role ───────────────────────────────
export async function POST(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);

  try { await checkApiAuth(request); } catch { return authError(); }

  try {
    const body = await request.json();
    const parsed = createRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, displayName, description, permissionIds } = parsed.data;

    const existing = await db.role.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: 'Rôle déjà existant' }, { status: 409 });
    }

    const role = await db.role.create({
      data: { name, displayName, description: description ?? '', isSystem: false },
    });

    if (permissionIds && permissionIds.length > 0) {
      const perms = await db.permission.findMany({ where: { id: { in: permissionIds } } });
      if (perms.length > 0) {
        await db.rolePermission.createMany({
          data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
          skipDuplicates: true,
        });
      }
    }

    return NextResponse.json({ id: role.id, name: role.name, displayName: role.displayName, description: role.description, isSystem: role.isSystem, createdAt: role.createdAt.toISOString() }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── PATCH — Edit role ────────────────────────────────
export async function PATCH(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);

  try { await checkApiAuth(request); } catch { return authError(); }

  try {
    const body = await request.json();
    const parsed = patchRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { id, displayName, description, permissionIds } = parsed.data;

    const existing = await db.role.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Rôle introuvable' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (displayName !== undefined) data.displayName = displayName;
    if (description !== undefined) data.description = description;

    const updated = await db.role.update({ where: { id }, data });

    if (permissionIds !== undefined) {
      await db.rolePermission.deleteMany({ where: { roleId: id } });
      if (permissionIds.length > 0) {
        const perms = await db.permission.findMany({ where: { id: { in: permissionIds } } });
        if (perms.length > 0) {
          await db.rolePermission.createMany({
            data: perms.map((p) => ({ roleId: id, permissionId: p.id })),
            skipDuplicates: true,
          });
        }
      }
    }

    const finalCount = await db.rolePermission.count({ where: { roleId: id } });
    return NextResponse.json({ id: updated.id, name: updated.name, displayName: updated.displayName, description: updated.description, isSystem: updated.isSystem, permissionCount: finalCount, createdAt: updated.createdAt.toISOString() });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── DELETE — Delete role (non-system only) ───────────
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

    const role = await db.role.findUnique({ where: { id } });
    if (!role) {
      return NextResponse.json({ error: 'Rôle introuvable' }, { status: 404 });
    }

    if (role.isSystem) {
      return NextResponse.json({ error: 'Les rôles système ne peuvent pas être supprimés' }, { status: 403 });
    }

    await db.rolePermission.deleteMany({ where: { roleId: id } });
    await db.userRole.deleteMany({ where: { roleId: id } });
    await db.role.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
