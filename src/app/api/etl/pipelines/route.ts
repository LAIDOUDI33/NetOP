import { z } from 'zod';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { checkApiAuth, authError, forbiddenError } from '@/lib/api-auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

// ─── Schemas ─────────────────────────────────────────────
const createPipelineSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  source: z.string().optional(),
  target: z.string().optional(),
  schedule: z.string().optional(),
  description: z.string().optional(),
  transformationSteps: z.array(z.record(z.string(), z.unknown())).optional(),
  retryMaxAttempts: z.number().int().min(1).max(10).optional(),
});

const updatePipelineSchema = z.object({
  id: z.string().min(1, 'L\'identifiant est requis'),
  name: z.string().optional(),
  description: z.string().optional(),
  schedule: z.string().optional(),
  enabled: z.boolean().optional(),
  transformationSteps: z.array(z.record(z.string(), z.unknown())).optional(),
  retryMaxAttempts: z.number().int().min(1).max(10).optional(),
  status: z.string().optional(),
});

// ─── GET — List pipelines with latest execution & count ──
export async function GET(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const user = await checkApiAuth(request);
    const perms = (user.permissions as string[]) ?? [];
    const canView = perms.includes('*:*') || perms.includes('etl:*') || perms.includes('etl:view');
    if (!canView) return forbiddenError();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'UNAUTHENTICATED') return authError();
    if (msg === 'FORBIDDEN') return forbiddenError();
    return authError();
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') ?? '';
    const status = searchParams.get('status') ?? undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10), 0);

    const where: Record<string, unknown> = {};
    if (search) {
      where.name = { contains: search };
    }
    if (status) {
      where.status = status;
    }

    const [pipelines, total] = await Promise.all([
      db.dataPipeline.findMany({
        where,
        include: {
          _count: { select: { executions: true } },
          executions: {
            orderBy: { startedAt: 'desc' },
            take: 1,
            select: {
              id: true,
              status: true,
              triggerType: true,
              startedAt: true,
              completedAt: true,
              durationMs: true,
              recordsIn: true,
              recordsOut: true,
              recordsError: true,
              errorRate: true,
              errorMessage: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      db.dataPipeline.count({ where }),
    ]);

    const result = pipelines.map((p) => {
      const latestExecution = p.executions[0] ?? null;
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        source: p.source,
        target: p.target,
        schedule: p.schedule,
        status: p.status,
        lastRun: p.lastRun?.toISOString() ?? null,
        nextRun: p.nextRun?.toISOString() ?? null,
        recordsProcessed: p.recordsProcessed,
        errorRate: p.errorRate,
        avgDurationMs: p.avgDurationMs,
        transformationSteps: JSON.parse(p.transformationSteps),
        retryMaxAttempts: p.retryMaxAttempts,
        retryDelayMs: p.retryDelayMs,
        totalRuns: p.totalRuns,
        successRuns: p.successRuns,
        failedRuns: p.failedRuns,
        totalRecordsIn: p.totalRecordsIn,
        totalRecordsOut: p.totalRecordsOut,
        totalRecordsErr: p.totalRecordsErr,
        enabled: p.enabled,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        executionCount: p._count.executions,
        latestExecution: latestExecution
          ? {
              ...latestExecution,
              startedAt: latestExecution.startedAt.toISOString(),
              completedAt: latestExecution.completedAt?.toISOString() ?? null,
            }
          : null,
      };
    });

    return NextResponse.json({ pipelines: result, total });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST — Create pipeline ─────────────────────────────
export async function POST(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const user = await checkApiAuth(request);
    const perms = (user.permissions as string[]) ?? [];
    const canCreate = perms.includes('*:*') || perms.includes('etl:*') || perms.includes('etl:create');
    if (!canCreate) return forbiddenError();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'UNAUTHENTICATED') return authError();
    if (msg === 'FORBIDDEN') return forbiddenError();
    return authError();
  }

  try {
    const body = await request.json();
    const parsed = createPipelineSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation échouée', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const currentUser = await checkApiAuth(request);
    const pipeline = await db.dataPipeline.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? '',
        source: parsed.data.source ?? '',
        target: parsed.data.target ?? '',
        schedule: parsed.data.schedule ?? '*/15 * * * *',
        transformationSteps: JSON.stringify(parsed.data.transformationSteps ?? []),
        retryMaxAttempts: parsed.data.retryMaxAttempts ?? 3,
        createdBy: currentUser.id as string,
      },
    });

    return NextResponse.json(
      {
        id: pipeline.id,
        name: pipeline.name,
        description: pipeline.description,
        source: pipeline.source,
        target: pipeline.target,
        schedule: pipeline.schedule,
        status: pipeline.status,
        enabled: pipeline.enabled,
        createdAt: pipeline.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── PATCH — Update pipeline ─────────────────────────────
export async function PATCH(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);

  let currentUser!: Record<string, unknown>;
  try {
    currentUser = await checkApiAuth(request);
    const perms = (currentUser.permissions as string[]) ?? [];
    const canEdit = perms.includes('*:*') || perms.includes('etl:*') || perms.includes('etl:edit');
    if (!canEdit) return forbiddenError();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'UNAUTHENTICATED') return authError();
    if (msg === 'FORBIDDEN') return forbiddenError();
    return authError();
  }

  try {
    const body = await request.json();
    const parsed = updatePipelineSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation échouée', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { id, enabled, ...rest } = parsed.data;
    const existing = await db.dataPipeline.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Pipeline non trouvé' }, { status: 404 });
    }

    // IDOR ownership check
    if (currentUser.id !== 'default-admin' && existing.createdBy !== currentUser.id) {
      return forbiddenError();
    }

    // If toggling enabled, adjust status accordingly
    const updateData: Record<string, unknown> = { ...rest };
    if (enabled !== undefined && enabled !== existing.enabled) {
      updateData.enabled = enabled;
      updateData.status = enabled ? 'active' : 'disabled';
    }
    if (rest.transformationSteps) {
      updateData.transformationSteps = JSON.stringify(rest.transformationSteps);
    }

    const pipeline = await db.dataPipeline.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: pipeline.id,
      name: pipeline.name,
      description: pipeline.description,
      schedule: pipeline.schedule,
      status: pipeline.status,
      enabled: pipeline.enabled,
      updatedAt: pipeline.updatedAt.toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── DELETE — Delete pipeline (not if running) ──────────
export async function DELETE(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);

  let currentUser!: Record<string, unknown>;
  try {
    currentUser = await checkApiAuth(request);
    const perms = (currentUser.permissions as string[]) ?? [];
    const canDelete = perms.includes('*:*') || perms.includes('etl:*') || perms.includes('etl:delete');
    if (!canDelete) return forbiddenError();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'UNAUTHENTICATED') return authError();
    if (msg === 'FORBIDDEN') return forbiddenError();
    return authError();
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'L\'identifiant id est requis' }, { status: 400 });
    }

    const existing = await db.dataPipeline.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Pipeline non trouvé' }, { status: 404 });
    }

    // IDOR ownership check
    if (currentUser.id !== 'default-admin' && existing.createdBy !== currentUser.id) {
      return forbiddenError();
    }

    // Check for currently running executions
    const runningExec = await db.pipelineExecution.findFirst({
      where: { pipelineId: id, status: 'running' },
    });
    if (runningExec) {
      return NextResponse.json(
        { error: 'Impossible de supprimer un pipeline avec une exécution en cours' },
        { status: 409 },
      );
    }

    await db.dataPipeline.delete({ where: { id } });
    return NextResponse.json({ success: true, deleted: id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
