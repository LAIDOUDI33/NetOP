import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const _auth = await checkApiAuth(request);
  if (!_auth) return authError();
  const moduleId = searchParams.get('moduleId');
  const technology = searchParams.get('technology');
  const status = searchParams.get('status');
  const siteId = searchParams.get('siteId');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const skip = (page - 1) * limit;

  try {
    const where: any = {};
    if (moduleId) where.moduleId = moduleId;
    if (technology && technology !== 'ALL') where.technology = technology;
    if (status && status !== 'ALL') where.status = status;
    if (siteId) where.siteId = siteId;

    const [actions, total] = await Promise.all([
      db.sonAction.findMany({
        where,
        include: {
          module: { select: { name: true, displayName: true } },
          site: { select: { name: true, code: true, region: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.sonAction.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      actions: actions.map((a) => ({
        id: a.id,
        moduleId: a.moduleId,
        moduleName: a.module.name,
        moduleDisplayName: a.module.displayName,
        siteId: a.siteId,
        siteName: a.site?.name,
        siteCode: a.site?.code,
        technology: a.technology,
        actionType: a.actionType,
        parameter: a.parameter,
        previousValue: a.previousValue,
        newValue: a.newValue,
        reason: a.reason,
        status: a.status,
        kpiBefore: typeof a.kpiBefore === 'string' ? JSON.parse(a.kpiBefore) : a.kpiBefore,
        kpiAfter: a.kpiAfter ? (typeof a.kpiAfter === 'string' ? JSON.parse(a.kpiAfter) : a.kpiAfter) : null,
        impactScore: a.impactScore,
        rollbackReason: a.rollbackReason,
        appliedAt: a.appliedAt?.toISOString(),
        rolledBackAt: a.rolledBackAt?.toISOString(),
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
  const _auth = await checkApiAuth(request);
  if (!_auth) return authError();
    const body = await request.json();
    const { actionId, action } = body; // action = 'apply' | 'rollback'

    if (!actionId || !action) {
      return NextResponse.json({ error: 'Missing required fields: actionId, action' }, { status: 400 });
    }

    if (action !== 'apply' && action !== 'rollback') {
      return NextResponse.json({ error: 'Invalid action. Must be "apply" or "rollback"' }, { status: 400 });
    }

    const existing = await db.sonAction.findUnique({
      where: { id: actionId },
      include: { module: true, site: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'SON action not found' }, { status: 404 });
    }

    if (action === 'apply' && existing.status !== 'pending') {
      return NextResponse.json({ error: `Cannot apply action with status "${existing.status}". Only "pending" actions can be applied.` }, { status: 400 });
    }

    if (action === 'rollback' && existing.status !== 'applied') {
      return NextResponse.json({ error: `Cannot rollback action with status "${existing.status}". Only "applied" actions can be rolled back.` }, { status: 400 });
    }

    const newStatus = action === 'apply' ? 'applied' : 'rolled_back';
    const timestampField = action === 'apply' ? 'appliedAt' : 'rolledBackAt';

    const updated = await db.sonAction.update({
      where: { id: actionId },
      data: {
        status: newStatus,
        [timestampField]: new Date(),
      },
    });

    await db.auditLog.create({
      data: {
        entityType: 'son_action',
        entityId: actionId,
        action: action,
        oldValue: existing.status,
        newValue: newStatus,
        description: `SON action ${actionId} ${action}ed: ${existing.module.displayName} - ${existing.actionType} on ${existing.site?.name || 'unknown site'} (${existing.parameter}: ${existing.previousValue} → ${existing.newValue})`,
        technology: existing.technology,
      },
    });

    return NextResponse.json({
      success: true,
      action: {
        ...updated,
        kpiBefore: typeof updated.kpiBefore === 'string' ? JSON.parse(updated.kpiBefore) : updated.kpiBefore,
        kpiAfter: updated.kpiAfter ? (typeof updated.kpiAfter === 'string' ? JSON.parse(updated.kpiAfter) : updated.kpiAfter) : null,
        appliedAt: updated.appliedAt?.toISOString(),
        rolledBackAt: updated.rolledBackAt?.toISOString(),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}