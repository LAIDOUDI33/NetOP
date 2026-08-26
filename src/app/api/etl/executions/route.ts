import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { checkApiAuth, authError, forbiddenError } from '@/lib/api-auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

// ─── GET — List executions with pipeline info ────────────
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
    const pipelineId = searchParams.get('pipelineId') ?? undefined;
    const status = searchParams.get('status') ?? undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10), 0);

    const where: Record<string, unknown> = {};
    if (pipelineId) {
      where.pipelineId = pipelineId;
    }
    if (status) {
      where.status = status;
    }

    const [executions, total] = await Promise.all([
      db.pipelineExecution.findMany({
        where,
        include: {
          pipeline: {
            select: { id: true, name: true, source: true, target: true },
          },
        },
        orderBy: { startedAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      db.pipelineExecution.count({ where }),
    ]);

    const result = executions.map((e) => {
      let stepResults: unknown[] = [];
      try {
        stepResults = JSON.parse(e.stepResults);
      } catch {
        stepResults = [];
      }

      return {
        id: e.id,
        pipelineId: e.pipelineId,
        pipeline: e.pipeline
          ? {
              id: e.pipeline.id,
              name: e.pipeline.name,
              source: e.pipeline.source,
              target: e.pipeline.target,
            }
          : null,
        status: e.status,
        triggerType: e.triggerType,
        recordsIn: e.recordsIn,
        recordsOut: e.recordsOut,
        recordsError: e.recordsError,
        errorRate: e.errorRate,
        startedAt: e.startedAt.toISOString(),
        completedAt: e.completedAt?.toISOString() ?? null,
        durationMs: e.durationMs,
        errorMessage: e.errorMessage,
        retryCount: e.retryCount,
        maxRetries: e.maxRetries,
        stepResults,
        createdAt: e.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ executions: result, total });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
