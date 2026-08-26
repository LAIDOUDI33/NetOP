import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { checkApiAuth, authError, forbiddenError } from '@/lib/api-auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

// ─── GET — List quality results with rule info ───────────
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
    const ruleId = searchParams.get('ruleId') ?? undefined;
    const pipelineId = searchParams.get('pipelineId') ?? undefined;
    const passedParam = searchParams.get('passed');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10), 0);

    const where: Record<string, unknown> = {};
    if (ruleId) {
      where.ruleId = ruleId;
    }
    if (pipelineId) {
      where.pipelineId = pipelineId;
    }
    if (passedParam !== null && passedParam !== '') {
      where.passed = passedParam === 'true';
    }

    const [results, total] = await Promise.all([
      db.dataQualityResult.findMany({
        where,
        include: {
          rule: {
            select: { id: true, name: true, targetModel: true, severity: true, ruleType: true },
          },
          pipeline: {
            select: { id: true, name: true },
          },
        },
        orderBy: { evaluatedAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      db.dataQualityResult.count({ where }),
    ]);

    const mapped = results.map((r) => {
      let details: unknown = {};
      try {
        details = JSON.parse(r.details);
      } catch {
        details = {};
      }

      return {
        id: r.id,
        ruleId: r.ruleId,
        rule: r.rule
          ? {
              id: r.rule.id,
              name: r.rule.name,
              targetModel: r.rule.targetModel,
              severity: r.rule.severity,
              ruleType: r.rule.ruleType,
            }
          : null,
        pipelineId: r.pipelineId,
        pipeline: r.pipeline
          ? {
              id: r.pipeline.id,
              name: r.pipeline.name,
            }
          : null,
        executionId: r.executionId,
        passed: r.passed,
        actualValue: r.actualValue,
        expectedValue: r.expectedValue,
        evaluatedAt: r.evaluatedAt.toISOString(),
        details,
        createdAt: r.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ results: mapped, total });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
