import { z } from 'zod';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError } from '@/lib/api-auth';

const createPolicySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  technology: z.string().min(1),
  triggerType: z.enum(['kpi_breach', 'anomaly_detected', 'schedule', 'manual']),
  triggerConfig: z.record(z.string(), z.unknown()).optional(),
  actionModules: z.array(z.unknown()).optional(),
  scope: z.string().optional(),
  scopeValue: z.string().nullable().optional(),
  priority: z.number().int().min(1).max(10).optional(),
  enabled: z.boolean().optional(),
  cooldownMins: z.number().int().min(0).optional(),
});

const patchPolicySchema = z.object({
  policyId: z.string().min(1),
  action: z.enum(['toggle', 'trigger']),
  triggerReason: z.string().optional(),
});

export async function GET(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);
  try {
    const policies = await db.policy.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const result = await Promise.all(
      policies.map(async (p) => {
        const executions = await db.policyExecution.findMany({
          where: { policyId: p.id },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });

        const totalCount = await db.policyExecution.count({
          where: { policyId: p.id },
        });

        const successCount = await db.policyExecution.count({
          where: { policyId: p.id, status: 'completed' },
        });

        const stats: Record<string, unknown> =
          typeof p.stats === 'string' ? JSON.parse(p.stats) : p.stats;

        const successRate = totalCount > 0 ? Number(((successCount / totalCount) * 100).toFixed(1)) : 0;

        return {
          id: p.id,
          name: p.name,
          description: p.description,
          technology: p.technology,
          triggerType: p.triggerType,
          triggerConfig: typeof p.triggerConfig === 'string' ? JSON.parse(p.triggerConfig) : p.triggerConfig,
          actionModules: typeof p.actionModules === 'string' ? JSON.parse(p.actionModules) : p.actionModules,
          scope: p.scope,
          scopeValue: p.scopeValue,
          priority: p.priority,
          enabled: p.enabled,
          cooldownMins: p.cooldownMins,
          stats,
          executionStats: {
            totalRuns: totalCount,
            successRate,
            lastRun: executions[0]?.createdAt?.toISOString() || null,
          },
          recentExecutions: executions.map((e) => ({
            id: e.id,
            policyId: e.policyId,
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
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        };
      }),
    );

    return NextResponse.json({ policies: result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);
  try {
    const body = await request.json();
    const parsed = createPolicySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const {
      name,
      description,
      technology,
      triggerType,
      triggerConfig,
      actionModules,
      scope,
      scopeValue,
      priority,
      enabled,
      cooldownMins,
    } = parsed.data;

    const policy = await db.policy.create({
      data: {
        name,
        description: description || '',
        technology,
        triggerType,
        triggerConfig: triggerConfig ? JSON.stringify(triggerConfig) : '{}',
        actionModules: actionModules ? JSON.stringify(actionModules) : '[]',
        scope: scope || 'all',
        scopeValue: scopeValue || null,
        priority: priority ?? 5,
        enabled: enabled ?? true,
        cooldownMins: cooldownMins ?? 30,
      },
    });

    await db.auditLog.create({
      data: {
        entityType: 'policy',
        entityId: policy.id,
        action: 'create',
        newValue: policy.name,
        description: `Policy "${policy.name}" created — trigger: ${policy.triggerType}, tech: ${policy.technology}, scope: ${policy.scope}`,
        technology: policy.technology,
      },
    });

    return NextResponse.json(
      {
        success: true,
        policy: {
          ...policy,
          triggerConfig: JSON.parse(policy.triggerConfig),
          actionModules: JSON.parse(policy.actionModules),
          stats: JSON.parse(policy.stats),
          createdAt: policy.createdAt.toISOString(),
          updatedAt: policy.updatedAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);
  try {
    const body = await request.json();
    const parsed = patchPolicySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { policyId, action, ...rest } = parsed.data;

    const existing = await db.policy.findUnique({ where: { id: policyId } });

    if (!existing) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    if (action === 'toggle') {
      const newEnabled = !existing.enabled;
      const updated = await db.policy.update({
        where: { id: policyId },
        data: { enabled: newEnabled },
      });

      await db.auditLog.create({
        data: {
          entityType: 'policy',
          entityId: policyId,
          action: 'toggle',
          oldValue: String(existing.enabled),
          newValue: String(newEnabled),
          description: `Policy "${existing.name}" ${newEnabled ? 'enabled' : 'disabled'}`,
          technology: existing.technology,
        },
      });

      return NextResponse.json({
        success: true,
        policy: {
          ...updated,
          triggerConfig: JSON.parse(updated.triggerConfig),
          actionModules: JSON.parse(updated.actionModules),
          stats: JSON.parse(updated.stats),
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      });
    }

    if (action === 'trigger') {
      const triggerReason = rest.triggerReason || 'Manual trigger';

      const execution = await db.policyExecution.create({
        data: {
          policyId,
          status: 'triggered',
          triggerReason,
        },
      });

      await db.auditLog.create({
        data: {
          entityType: 'policy_execution',
          entityId: execution.id,
          action: 'trigger',
          newValue: triggerReason,
          description: `Policy "${existing.name}" manually triggered — reason: ${triggerReason}`,
          technology: existing.technology,
        },
      });

      return NextResponse.json(
        {
          success: true,
          execution: {
            ...execution,
            affectedSites: JSON.parse(execution.affectedSites),
            actionsTaken: JSON.parse(execution.actionsTaken),
            kpiImpact: JSON.parse(execution.kpiImpact),
            createdAt: execution.createdAt.toISOString(),
            completedAt: execution.completedAt?.toISOString(),
          },
        },
        { status: 201 },
      );
    }

    return NextResponse.json({ error: `Invalid action: ${action}. Must be "toggle" or "trigger"` }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}