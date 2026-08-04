import { z } from 'zod';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { checkApiAuth, authError, forbiddenError } from '@/lib/api-auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

function randomChars(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function randomHash(): string {
  const chars = 'abcdef0123456789';
  let result = '';
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const createApiKeySchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  permissions: z.array(z.string()).optional(),
  description: z.string().optional(),
  expiresAt: z.string().optional(),
});

const updateApiKeySchema = z.object({
  id: z.string().min(1, "L'identifiant est requis"),
  name: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  isEnabled: z.boolean().optional(),
  description: z.string().optional(),
});

// ────────────────────────────────────────────
// GET — List API keys (never return keyHash)
// ────────────────────────────────────────────
export async function GET(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const user = await checkApiAuth(request);
    const perms = (user.permissions as string[]) ?? [];
    const canView = perms.includes('*:*') || perms.includes('apikeys:*') || perms.includes('apikeys:view');
    if (!canView) return forbiddenError();
  } catch (e: any) {
    if (e.message === 'UNAUTHENTICATED') return authError();
    if (e.message === 'FORBIDDEN') return forbiddenError();
    return authError();
  }

  try {
    const { searchParams } = new URL(request.url);
    const isEnabledFilter = searchParams.get('isEnabled');

    const where: Record<string, unknown> = {};
    if (isEnabledFilter !== null) {
      where.isEnabled = isEnabledFilter === 'true';
    }

    const keys = await db.apiKey.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const result = keys.map((k) => {
      let parsedPermissions: string[] = [];
      try {
        parsedPermissions = JSON.parse(k.permissions as string);
      } catch {
        parsedPermissions = [];
      }

      return {
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        permissions: parsedPermissions,
        isEnabled: k.isEnabled,
        expiresAt: k.expiresAt?.toISOString() ?? null,
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        requestCount: k.requestCount,
        description: k.description,
        createdBy: k.createdBy,
        createdAt: k.createdAt.toISOString(),
        updatedAt: k.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({ keys: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ error: message, keys: [] }, { status: 500 });
  }
}

// ────────────────────────────────────────────
// POST — Create API key
// ────────────────────────────────────────────
export async function POST(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 20 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const user = await checkApiAuth(request);
    const perms = (user.permissions as string[]) ?? [];
    const canCreate = perms.includes('*:*') || perms.includes('apikeys:*') || perms.includes('apikeys:create');
    if (!canCreate) return forbiddenError();
  } catch (e: any) {
    if (e.message === 'UNAUTHENTICATED') return authError();
    if (e.message === 'FORBIDDEN') return forbiddenError();
    return authError();
  }

  try {
    const body = await request.json();
    const parsed = createApiKeySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { name, permissions, description, expiresAt } = parsed.data;
    const keySuffix = randomChars(32);
    const keyPrefix = `nopt_${randomChars(4)}`;
    const fullKey = `${keyPrefix}_${keySuffix}`;
    const keyHash = `sha256$${randomHash()}`;
    const permissionsJson = JSON.stringify(permissions ?? []);

    const apiKey = await db.apiKey.create({
      data: {
        name,
        keyHash,
        keyPrefix,
        permissions: permissionsJson,
        isEnabled: true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        lastUsedAt: null,
        requestCount: 0,
        description: description ?? undefined,
        createdBy: 'system',
      },
    });

    let parsedPermissions: string[] = [];
    try {
      parsedPermissions = JSON.parse(permissionsJson);
    } catch {
      parsedPermissions = [];
    }

    return NextResponse.json({
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      key: fullKey,
      permissions: parsedPermissions,
      expiresAt: apiKey.expiresAt?.toISOString() ?? null,
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur lors de la création de la clé API";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ────────────────────────────────────────────
// PATCH — Update API key
// ────────────────────────────────────────────
export async function PATCH(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const user = await checkApiAuth(request);
    const perms = (user.permissions as string[]) ?? [];
    const canEdit = perms.includes('*:*') || perms.includes('apikeys:*') || perms.includes('apikeys:edit');
    if (!canEdit) return forbiddenError();
  } catch (e: any) {
    if (e.message === 'UNAUTHENTICATED') return authError();
    if (e.message === 'FORBIDDEN') return forbiddenError();
    return authError();
  }

  try {
    const body = await request.json();
    const parsed = updateApiKeySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { id, name, permissions, isEnabled, description } = parsed.data;

    const existing = await db.apiKey.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Clé API introuvable' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (permissions !== undefined) data.permissions = JSON.stringify(permissions);
    if (isEnabled !== undefined) data.isEnabled = isEnabled;
    if (description !== undefined) data.description = description;

    const updated = await db.apiKey.update({
      where: { id },
      data,
    });

    let parsedPermissions: string[] = [];
    try {
      parsedPermissions = JSON.parse(updated.permissions as string);
    } catch {
      parsedPermissions = [];
    }

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      keyPrefix: updated.keyPrefix,
      permissions: parsedPermissions,
      isEnabled: updated.isEnabled,
      expiresAt: updated.expiresAt?.toISOString() ?? null,
      lastUsedAt: updated.lastUsedAt?.toISOString() ?? null,
      requestCount: updated.requestCount,
      description: updated.description,
      createdBy: updated.createdBy,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur lors de la mise à jour de la clé API";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ────────────────────────────────────────────
// DELETE — Delete API key
// ────────────────────────────────────────────
export async function DELETE(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const user = await checkApiAuth(request);
    const perms = (user.permissions as string[]) ?? [];
    const canDelete = perms.includes('*:*') || perms.includes('apikeys:*') || perms.includes('apikeys:delete');
    if (!canDelete) return forbiddenError();
  } catch (e: any) {
    if (e.message === 'UNAUTHENTICATED') return authError();
    if (e.message === 'FORBIDDEN') return forbiddenError();
    return authError();
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: "L'identifiant est requis" }, { status: 400 });
    }

    const existing = await db.apiKey.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Clé API introuvable' }, { status: 404 });
    }

    await db.apiKey.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur lors de la suppression de la clé API";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
