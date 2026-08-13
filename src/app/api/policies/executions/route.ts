import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);
  const { searchParams } = new URL(request.url);
  const policyId = searchParams.get('policyId');
  const status = searchParams.get('status');

  try {
    const where: any = {};
    if (policyId) where.policyId = policyId;
    if (status && status !== 'ALL') where.status = status;

    const executions = await db.policyExecution.findMany({
      where,
      include: {
        policy: { select: { name: true, technology: true, triggerType: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      executions: executions.map((e) => ({
        id: e.id,
        policyId: e.policyId,
        policyName: e.policy.name,
        policyTechnology: e.policy.technology,
        policyTriggerType: e.policy.triggerType,
        status: e.status,
        triggerReason: e.triggerReason,
        affectedSites: typeof e.affectedSites === 'string' ? JSON.parse(e.affectedSites) : e.affectedSites,
        actionsTaken: typeof e.actionsTaken === 'string' ? JSON.parse(e.actionsTaken) : e.actionsTaken,
        kpiImpact: typeof e.kpiImpact === 'string' ? JSON.parse(e.kpiImpact) : e.kpiImpact,
        rollbackReason: e.rollbackReason,
        durationMs: e.durationMs,
        createdAt: e.createdAt.toISOString(),
        completedAt: e.completedAt?.toISOString(),
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}