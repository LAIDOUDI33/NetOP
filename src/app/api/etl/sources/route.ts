import { z } from 'zod';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { checkApiAuth, authError, forbiddenError } from '@/lib/api-auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

// ─── Constants ───────────────────────────────────────────
const SOURCE_TYPES = ['oss', 'crm', 'billing', 'kpi', 'probe', 'external_api', 'file', 'database'] as const;

// ─── Schemas ─────────────────────────────────────────────
const createSourceSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  type: z.enum(SOURCE_TYPES, {
    message: `Type invalide. Valeurs: ${SOURCE_TYPES.join(', ')}`,
  }),
  protocol: z.string().min(1, 'Le protocole est requis'),
  endpoint: z.string().optional(),
  description: z.string().optional(),
  region: z.string().optional(),
  vendor: z.string().optional(),
});

const updateSourceSchema = z.object({
  id: z.string().min(1, 'L\'identifiant est requis'),
  name: z.string().optional(),
  type: z.enum(SOURCE_TYPES).optional(),
  protocol: z.string().optional(),
  endpoint: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  region: z.string().optional(),
  vendor: z.string().optional(),
});

// ─── GET — List data sources ─────────────────────────────
export async function GET(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const user = await checkApiAuth(request);
    const perms = (user.permissions as string[]) ?? [];
    const canView = perms.includes('*:*') || perms.includes('etl:*') || perms.includes('etl:view');
    if (!canView) return forbiddenError();
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHENTICATED') return authError();
    if (e instanceof Error && e.message === 'FORBIDDEN') return forbiddenError();
    return authError();
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') ?? undefined;
    const status = searchParams.get('status') ?? undefined;

    const where: Record<string, unknown> = {};
    if (type) {
      where.type = type;
    }
    if (status) {
      where.status = status;
    }

    const sources = await db.dataSource.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const result = sources.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      protocol: s.protocol,
      endpoint: s.endpoint,
      status: s.status,
      description: s.description,
      config: JSON.parse(s.config),
      recordsAvailable: s.recordsAvailable,
      lastSyncAt: s.lastSyncAt?.toISOString() ?? null,
      lastSyncRecords: s.lastSyncRecords,
      lastSyncStatus: s.lastSyncStatus,
      freshnessSeconds: s.freshnessSeconds,
      avgLatencyMs: s.avgLatencyMs,
      region: s.region,
      vendor: s.vendor,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    return NextResponse.json({ sources: result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── POST — Create data source ──────────────────────────
export async function POST(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const user = await checkApiAuth(request);
    const perms = (user.permissions as string[]) ?? [];
    const canCreate = perms.includes('*:*') || perms.includes('etl:*') || perms.includes('etl:create');
    if (!canCreate) return forbiddenError();
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHENTICATED') return authError();
    if (e instanceof Error && e.message === 'FORBIDDEN') return forbiddenError();
    return authError();
  }

  try {
    const body = await request.json();
    const parsed = createSourceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation échouée', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const source = await db.dataSource.create({
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        protocol: parsed.data.protocol,
        endpoint: parsed.data.endpoint ?? '',
        description: parsed.data.description ?? '',
        region: parsed.data.region ?? '',
        vendor: parsed.data.vendor ?? '',
      },
    });

    return NextResponse.json(
      {
        id: source.id,
        name: source.name,
        type: source.type,
        protocol: source.protocol,
        endpoint: source.endpoint,
        status: source.status,
        description: source.description,
        region: source.region,
        vendor: source.vendor,
        createdAt: source.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── PATCH — Update data source ─────────────────────────
export async function PATCH(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const user = await checkApiAuth(request);
    const perms = (user.permissions as string[]) ?? [];
    const canEdit = perms.includes('*:*') || perms.includes('etl:*') || perms.includes('etl:edit');
    if (!canEdit) return forbiddenError();
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHENTICATED') return authError();
    if (e instanceof Error && e.message === 'FORBIDDEN') return forbiddenError();
    return authError();
  }

  try {
    const body = await request.json();
    const parsed = updateSourceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation échouée', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { id, ...data } = parsed.data;
    const existing = await db.dataSource.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Source de données non trouvée' }, { status: 404 });
    }

    const source = await db.dataSource.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      id: source.id,
      name: source.name,
      type: source.type,
      protocol: source.protocol,
      endpoint: source.endpoint,
      status: source.status,
      description: source.description,
      region: source.region,
      vendor: source.vendor,
      updatedAt: source.updatedAt.toISOString(),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── DELETE — Delete data source ─────────────────────────
export async function DELETE(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const user = await checkApiAuth(request);
    const perms = (user.permissions as string[]) ?? [];
    const canDelete = perms.includes('*:*') || perms.includes('etl:*') || perms.includes('etl:delete');
    if (!canDelete) return forbiddenError();
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHENTICATED') return authError();
    if (e instanceof Error && e.message === 'FORBIDDEN') return forbiddenError();
    return authError();
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'L\'identifiant id est requis' }, { status: 400 });
    }

    const existing = await db.dataSource.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Source de données non trouvée' }, { status: 404 });
    }

    await db.dataSource.delete({ where: { id } });
    return NextResponse.json({ success: true, deleted: id });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
