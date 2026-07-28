import { z } from 'zod';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

const createSonModuleSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1),
  technology: z.enum(['2G', '3G', '4G', '5G', 'ALL']),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  mode: z.enum(['open-loop', 'semi-automated', 'closed-loop']).optional(),
  schedule: z.string().nullable().optional(),
  parameters: z.record(z.string(), z.any()).optional(),
});

const patchSonModuleSchema = z.object({
  moduleId: z.string().min(1),
  action: z.enum(['toggle', 'execute', 'rollback']),
});

export async function GET(request: NextRequest) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);
  const { searchParams } = new URL(request.url);
  const technology = searchParams.get('technology');

  try {
    const where: any = {};
    if (technology && technology !== 'ALL') {
      where.technology = technology;
    }

    const modules = await db.sonModule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const result = await Promise.all(
      modules.map(async (mod) => {
        const actionCount = await db.sonAction.count({
          where: { moduleId: mod.id },
        });

        const recentActions = await db.sonAction.findMany({
          where: { moduleId: mod.id },
          include: {
            site: { select: { name: true, code: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });

        const stats: Record<string, number> =
          typeof mod.stats === 'string' ? JSON.parse(mod.stats) : mod.stats;

        return {
          id: mod.id,
          name: mod.name,
          displayName: mod.displayName,
          technology: mod.technology,
          description: mod.description,
          enabled: mod.enabled,
          mode: mod.mode,
          schedule: mod.schedule,
          parameters: typeof mod.parameters === 'string' ? JSON.parse(mod.parameters) : mod.parameters,
          stats,
          actionCount,
          recentActions: recentActions.map((a) => ({
            id: a.id,
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
            impactScore: a.impactScore,
            appliedAt: a.appliedAt?.toISOString(),
            rolledBackAt: a.rolledBackAt?.toISOString(),
            createdAt: a.createdAt.toISOString(),
          })),
          createdAt: mod.createdAt.toISOString(),
          updatedAt: mod.updatedAt.toISOString(),
        };
      }),
    );

    return NextResponse.json({ modules: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);
  try {
    const body = await request.json();
    const parsed = createSonModuleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { name, displayName, technology, description, enabled, mode, schedule, parameters } = parsed.data;

    const newModule = await db.sonModule.create({
      data: {
        name,
        displayName,
        technology,
        description: description || '',
        enabled: enabled ?? true,
        mode: mode || 'semi-automated',
        schedule: schedule || null,
        parameters: parameters ? JSON.stringify(parameters) : '{}',
      },
    });

    await db.auditLog.create({
      data: {
        entityType: 'son_module',
        entityId: newModule.id,
        action: 'create',
        newValue: newModule.name,
        description: `SON module "${newModule.displayName}" (${newModule.name}) created for ${newModule.technology}`,
        technology: newModule.technology,
      },
    });

    return NextResponse.json({
      success: true,
      module: {
        ...newModule,
        parameters: JSON.parse(newModule.parameters),
        stats: JSON.parse(newModule.stats),
        createdAt: newModule.createdAt.toISOString(),
        updatedAt: newModule.updatedAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);
  try {
    const body = await request.json();
    const parsed = patchSonModuleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { moduleId, action } = parsed.data;

    const existing = await db.sonModule.findUnique({
      where: { id: moduleId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'SON module not found' }, { status: 404 });
    }

    if (action === 'toggle') {
      const updated = await db.sonModule.update({
        where: { id: moduleId },
        data: { enabled: !existing.enabled },
      });

      await db.auditLog.create({
        data: {
          entityType: 'son_module',
          entityId: moduleId,
          action: 'toggle',
          oldValue: existing.enabled ? 'enabled' : 'disabled',
          newValue: !existing.enabled ? 'enabled' : 'disabled',
          description: `SON module "${existing.displayName}" toggled ${!existing.enabled ? 'on' : 'off'}`,
          technology: existing.technology,
        },
      });

      return NextResponse.json({
        success: true,
        module: {
          ...updated,
          parameters: JSON.parse(updated.parameters),
          stats: JSON.parse(updated.stats),
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      });
    }

    if (action === 'execute') {
      if (!existing.enabled) {
        return NextResponse.json({ error: 'Cannot execute a disabled module. Enable it first.' }, { status: 400 });
      }

      // Simulate execution: create a sample pending action for demonstration
      const tech = existing.technology === 'ALL' ? '4G' : existing.technology;

      // Pick a random site from the database for the demo action
      const sites = await db.networkSite.findMany({
        where: { technology: tech },
        take: 10,
      });
      const site = sites.length > 0 ? sites[Math.floor(Math.random() * sites.length)] : null;

      const actionTypeMap: Record<string, { type: string; parameter: string; prev: string; next: string }> = {
        ANR: { type: 'add_neighbor', parameter: 'neighborRelation', prev: 'none', next: 'auto_discovered' },
        PCI: { type: 'modify_pci', parameter: 'pci', prev: '0', next: String(Math.floor(Math.random() * 504)) },
        MRO: { type: 'adjust_tilt', parameter: 'electricalTilt', prev: '6', next: String(4 + Math.floor(Math.random() * 6)) },
        CCO: { type: 'adjust_power', parameter: 'dlPower', prev: '15.2', next: (12 + Math.random() * 6).toFixed(1) },
        HLB: { type: 'compensate_outage', parameter: 'loadBalance', prev: 'imbalanced', next: 'balanced' },
        CODC: { type: 'correct_config', parameter: 'configParam', prev: 'incorrect', next: 'corrected' },
        AIC: { type: 'adjust_power', parameter: 'icicThreshold', prev: '-105', next: '-100' },
        PnP: { type: 'add_neighbor', parameter: 'autoNeighbor', prev: 'none', next: 'pnp_added' },
      };

      const config = actionTypeMap[existing.name] || {
        type: 'correct_config',
        parameter: 'config',
        prev: 'before',
        next: 'after',
      };

      const newAction = await db.sonAction.create({
        data: {
          moduleId: existing.id,
          siteId: site?.id,
          technology: tech,
          actionType: config.type,
          parameter: config.parameter,
          previousValue: config.prev,
          newValue: config.next,
          reason: `Executed by ${existing.displayName} module`,
          status: 'applied',
          kpiBefore: '{}',
          kpiAfter: '{}',
          impactScore: 0.5 + Math.random() * 0.45,
          appliedAt: new Date(),
        },
      });

      // Update module stats
      const currentStats: Record<string, any> = JSON.parse(existing.stats);
      currentStats.totalActions = (currentStats.totalActions || 0) + 1;
      currentStats.successRate = Math.min(
        100,
        ((currentStats.totalActions - (currentStats.failCount || 0)) / currentStats.totalActions) * 100
      );
      currentStats.lastExecution = new Date().toISOString();

      await db.sonModule.update({
        where: { id: moduleId },
        data: { stats: JSON.stringify(currentStats) },
      });

      await db.auditLog.create({
        data: {
          entityType: 'son_module',
          entityId: moduleId,
          action: 'execute',
          newValue: newAction.id,
          description: `SON module "${existing.displayName}" executed: ${config.type} on ${site?.name || 'auto-selected'} (${config.parameter}: ${config.prev} → ${config.next})`,
          technology: tech,
        },
      });

      return NextResponse.json({
        success: true,
        action: {
          ...newAction,
          kpiBefore: JSON.parse(newAction.kpiBefore),
          kpiAfter: newAction.kpiAfter ? JSON.parse(newAction.kpiAfter) : null,
          appliedAt: newAction.appliedAt?.toISOString(),
          rolledBackAt: newAction.rolledBackAt?.toISOString(),
          createdAt: newAction.createdAt.toISOString(),
          updatedAt: newAction.updatedAt.toISOString(),
        },
      });
    }

    if (action === 'rollback') {
      // Rollback: mark all recent applied actions for this module as rolled_back
      const result = await db.sonAction.updateMany({
        where: {
          moduleId,
          status: 'applied',
        },
        data: {
          status: 'rolled_back',
          rolledBackAt: new Date(),
        },
      });

      await db.auditLog.create({
        data: {
          entityType: 'son_module',
          entityId: moduleId,
          action: 'rollback',
          newValue: String(result.count),
          description: `SON module "${existing.displayName}": rolled back ${result.count} applied action(s)`,
          technology: existing.technology,
        },
      });

      return NextResponse.json({
        success: true,
        rolledBackCount: result.count,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}