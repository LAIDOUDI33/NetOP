import { z } from 'zod';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { checkApiAuth, authError, forbiddenError } from '@/lib/api-auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

// ─── Schema ──────────────────────────────────────────────
const runPipelineSchema = z.object({
  pipelineId: z.string().min(1, 'L\'identifiant du pipeline est requis'),
});

// ─── POST — Trigger manual pipeline run ─────────────────
export async function POST(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 20 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const user = await checkApiAuth(request);
    const perms = (user.permissions as string[]) ?? [];
    const canExecute = perms.includes('*:*') || perms.includes('etl:*') || perms.includes('etl:execute');
    if (!canExecute) return forbiddenError();
  } catch (e: any) {
    if (e.message === 'UNAUTHENTICATED') return authError();
    if (e.message === 'FORBIDDEN') return forbiddenError();
    return authError();
  }

  try {
    const body = await request.json();
    const parsed = runPipelineSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation échouée', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { pipelineId } = parsed.data;

    // Verify pipeline exists and is enabled
    const pipeline = await db.dataPipeline.findUnique({ where: { id: pipelineId } });
    if (!pipeline) {
      return NextResponse.json({ error: 'Pipeline non trouvé' }, { status: 404 });
    }
    if (!pipeline.enabled) {
      return NextResponse.json(
        { error: 'Le pipeline est désactivé, impossible de le déclencher' },
        { status: 409 },
      );
    }

    // Check for overlapping execution
    const running = await db.pipelineExecution.findFirst({
      where: { pipelineId, status: 'running' },
    });
    if (running) {
      return NextResponse.json(
        { error: 'Une exécution est déjà en cours pour ce pipeline' },
        { status: 409 },
      );
    }

    // Create execution record
    const execution = await db.pipelineExecution.create({
      data: {
        pipelineId,
        status: 'running',
        triggerType: 'manual',
        maxRetries: pipeline.retryMaxAttempts,
      },
    });

    // Fire-and-forget trigger to ETL mini-service
    try {
      fetch('http://localhost:3010/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineId, executionId: execution.id }),
      }).catch(() => {
        // Silently ignore — the scheduler in the ETL service will pick it up
      });
    } catch {
      // Ignore fetch errors
    }

    return NextResponse.json(
      {
        executionId: execution.id,
        pipelineId,
        status: 'running',
        message: 'Exécution déclenchée manuellement',
      },
      { status: 202 },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
