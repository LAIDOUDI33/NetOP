import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { checkApiAuth, authError, forbiddenError } from '@/lib/api-auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

// ─── GET — ETL Dashboard ─────────────────────────────────
export async function GET(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 60 });
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
    // ── Pipelines stats ─────────────────────────────────
    const pipelines = await db.dataPipeline.findMany({ select: { status: true, enabled: true } });
    const activeCount = pipelines.filter(
      (p) => p.enabled && (p.status === 'active' || p.status === 'running'),
    ).length;
    const failedCount = pipelines.filter((p) => p.status === 'failed').length;
    const pausedCount = pipelines.filter((p) => p.status === 'paused').length;
    const disabledCount = pipelines.filter((p) => p.status === 'disabled' || !p.enabled).length;

    const pipelineStats = {
      total: pipelines.length,
      active: activeCount,
      failed: failedCount,
      paused: pausedCount,
      disabled: disabledCount,
    };

    // ── Executions stats (last 24h) ──────────────────────
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [exec24h, recentExecs] = await Promise.all([
      db.pipelineExecution.findMany({
        where: { startedAt: { gte: twentyFourHoursAgo } },
        select: {
          status: true,
          durationMs: true,
          recordsIn: true,
          recordsOut: true,
          recordsError: true,
        },
      }),
      // Last 10 executions for recent list
      db.pipelineExecution.findMany({
        orderBy: { startedAt: 'desc' },
        take: 10,
        include: {
          pipeline: { select: { id: true, name: true, source: true, target: true } },
        },
      }),
    ]);

    const succeeded24h = exec24h.filter((e) => e.status === 'succeeded').length;
    const failed24h = exec24h.filter((e) => e.status === 'failed').length;
    const totalRecords24h = exec24h.reduce((s, e) => s + e.recordsIn, 0);
    const completedExecs = exec24h.filter((e) => e.durationMs > 0);
    const avgDurationMs =
      completedExecs.length > 0
        ? Math.round(completedExecs.reduce((s, e) => s + e.durationMs, 0) / completedExecs.length)
        : 0;

    const executionStats = {
      total24h: exec24h.length,
      succeeded24h,
      failed24h,
      avgDurationMs,
      totalRecords24h,
    };

    // ── Quality stats ────────────────────────────────────
    const qualityRules = await db.dataQualityRule.findMany({
      select: { severity: true, isEnabled: true, lastPassRate: true },
    });

    const failingRules = qualityRules.filter(
      (r) => r.isEnabled && (r.lastPassRate ?? 100) < 100,
    ).length;

    const enabledQualityRules = qualityRules.filter((r) => r.isEnabled);
    const criticalRules = enabledQualityRules.filter((r) => r.severity === 'critical');
    const criticalPassRate =
      criticalRules.length > 0
        ? +(criticalRules.reduce((s, r) => s + (r.lastPassRate ?? 0), 0) / criticalRules.length).toFixed(1)
        : 100;

    const overallPassRate =
      enabledQualityRules.length > 0
        ? +(
            enabledQualityRules.reduce((s, r) => s + (r.lastPassRate ?? 0), 0) /
            enabledQualityRules.length
          ).toFixed(1)
        : 100;

    const qualityStats = {
      overallPassRate,
      criticalPassRate,
      failingRules,
    };

    // ── Sources stats ────────────────────────────────────
    const sources = await db.dataSource.findMany({ select: { status: true } });
    const sourceStats = {
      total: sources.length,
      active: sources.filter((s) => s.status === 'active').length,
      error: sources.filter((s) => s.status === 'error').length,
      maintenance: sources.filter((s) => s.status === 'maintenance').length,
    };

    // ── Recent executions (formatted) ───────────────────
    const recentExecutions = recentExecs.map((e) => {
      let stepResults: unknown[] = [];
      try {
        stepResults = JSON.parse(e.stepResults || '[]');
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
        stepResults,
      };
    });

    // ── Throughput: 24 hourly data points ────────────────
    // Aggregate PipelineExecution records by hour for last 24 hours
    const allExecs24h = await db.pipelineExecution.findMany({
      where: { startedAt: { gte: twentyFourHoursAgo } },
      select: {
        startedAt: true,
        recordsIn: true,
        recordsOut: true,
        recordsError: true,
      },
    });

    // Build hourly buckets
    const hourBuckets: Record<string, { ingested: number; transformed: number; errors: number }> = {};
    for (const e of allExecs24h) {
      const h = e.startedAt.toISOString().slice(11, 13);
      const key = `${h}:00`;
      if (!hourBuckets[key]) {
        hourBuckets[key] = { ingested: 0, transformed: 0, errors: 0 };
      }
      hourBuckets[key].ingested += e.recordsIn;
      hourBuckets[key].transformed += e.recordsOut;
      hourBuckets[key].errors += e.recordsError;
    }

    // Generate 24 data points, fill gaps
    const now = new Date();
    const throughput: { hour: string; ingested: number; transformed: number; errors: number }[] = [];
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hour = `${String(d.getHours()).padStart(2, '0')}:00`;
      const bucket = hourBuckets[hour];
      throughput.push({
        hour,
        ingested: bucket?.ingested ?? 0,
        transformed: bucket?.transformed ?? 0,
        errors: bucket?.errors ?? 0,
      });
    }

    return NextResponse.json({
      pipelines: pipelineStats,
      executions: executionStats,
      quality: qualityStats,
      sources: sourceStats,
      recentExecutions,
      throughput,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
