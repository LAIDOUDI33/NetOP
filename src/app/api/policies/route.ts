import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET() {
  try {
    const policies = await db.policy.findMany({
      orderBy: { createdAt: 'desc' },
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

        const stats: Record<string, any> =
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
  const _auth = await checkApiAuth(request);
  if (!_auth) return authError();
    const body = await request.json();
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
    } = body;

    if (!name || !technology || !triggerType) {
      return NextResponse.json(
        { error: 'Missing required fields: name, technology, triggerType' },
        { status: 400 },
      );
    }

    const validTriggerTypes = ['kpi_breach', 'anomaly_detected', 'schedule', 'manual'];
    if (!validTriggerTypes.includes(triggerType)) {
      return NextResponse.json(
        { error: `Invalid triggerType. Must be one of: ${validTriggerTypes.join(', ')}` },
        { status: 400 },
      );
    }

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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
  const _auth = await checkApiAuth(request);
  if (!_auth) return authError();
    const body = await request.json();
    const { policyId, action, ...rest } = body;

    if (!policyId || !action) {
      return NextResponse.json({ error: 'Missing required fields: policyId, action' }, { status: 400 });
    }

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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}