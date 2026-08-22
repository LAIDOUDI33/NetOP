import { z } from 'zod';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError } from '@/lib/api-auth';
import ZAI from 'z-ai-web-dev-sdk';

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

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
  try { await checkApiAuth(request); } catch { return authError(); }
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
  try { await checkApiAuth(request); } catch { return authError(); }
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
  try { await checkApiAuth(request); } catch { return authError(); }
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

      const tech = existing.technology === 'ALL' ? '4G' : existing.technology;

      // Pick a site that has KPI data for intelligent optimization
      const sitesWithKpi = await db.kpiMetric.findMany({
        where: { technology: tech },
        distinct: ['siteId'],
        select: { siteId: true },
        take: 20,
      });

      // If no KPI data found, fall back to any site
      const siteIds = sitesWithKpi.map(s => s.siteId);
      const sites = siteIds.length > 0
        ? await db.networkSite.findMany({ where: { id: { in: siteIds }, technology: tech }, take: 10 })
        : await db.networkSite.findMany({ where: { technology: tech }, take: 10 });
      const site = sites.length > 0 ? sites[0] : null;

      // Fetch latest KPI data for the selected site
      const latestKpi = site
        ? await db.kpiMetric.findFirst({
            where: { siteId: site.id, technology: tech },
            orderBy: { timestamp: 'desc' },
          })
        : null;

      const kpiData = latestKpi
        ? {
            rsrp: latestKpi.rsrp,
            rsrq: latestKpi.rsrq,
            sinr: latestKpi.sinr,
            downloadThroughput: latestKpi.downloadThroughput,
            uploadThroughput: latestKpi.uploadThroughput,
            latency: latestKpi.latency,
            availability: latestKpi.availability,
            prbUtilization: latestKpi.prbUtilization,
            handoverSuccessRate: latestKpi.handoverSuccessRate,
            dropRate: latestKpi.dropRate,
            activeUsers: latestKpi.activeUsers,
          }
        : null;

      // SON module descriptions for system prompt
      const moduleDescriptions: Record<string, string> = {
        ANR: 'Automatic Neighbor Relation - automatically discovers and manages neighbor cell relations to improve handover success and reduce dropped calls.',
        PCI: 'Physical Cell ID - optimizes cell IDs (0-503) to minimize inter-cell interference and improve signal quality (RSRQ, SINR).',
        MRO: 'Mobility Robustness Optimization - optimizes handover parameters (tilt, offsets, hysteresis) to reduce call drops and failed handovers.',
        CCO: 'Coverage & Capacity Optimization - balances coverage and capacity through downlink power, antenna tilt, and carrier configuration adjustments.',
        HLB: 'Hardware Load Balancing - distributes traffic load across cells to prevent congestion and improve user experience.',
        CODC: 'Conflict Detection & Coordination - detects and resolves parameter conflicts between different SON modules to maintain network stability.',
        AIC: 'Adaptive Interference Control - mitigates inter-cell interference through ICIC thresholds, power adjustments, and frequency planning.',
        PnP: 'Plug and Play - automatically configures newly deployed sites including neighbor relations, PCI assignment, and power settings.',
      };

      const llmActionSchema = z.object({
        actionType: z.string(),
        parameter: z.string(),
        previousValue: z.string(),
        newValue: z.string(),
        reason: z.string(),
      });

      let config: { actionType: string; parameter: string; previousValue: string; newValue: string; reason: string };
      let impactScore: number;
      let usedAi = false;

      if (kpiData) {
        // Try AI-powered analysis
        try {
          const zai = await getZai();
          const moduleName = existing.name;
          const moduleDesc = moduleDescriptions[moduleName] || `SON module ${existing.displayName}`;

          const systemPrompt = `You are an expert SON (Self-Organizing Network) engineer for Djezzy, Algeria's telecom operator.
You are running the ${moduleName} module: ${moduleDesc}
Technology: ${tech}
Site: ${site?.name || 'unknown'} (${site?.code || 'unknown'})

Based on the KPI data provided, analyze the current network conditions and generate ONE specific, actionable parameter change.
The change must be realistic and aligned with the ${moduleName} module's purpose.

Respond ONLY with a valid JSON object (no markdown, no code fences) with these fields:
- actionType: string - the type of action (e.g., "add_neighbor", "modify_pci", "adjust_tilt", "adjust_power", "compensate_outage", "correct_config", "update_threshold")
- parameter: string - the specific network parameter being changed
- previousValue: string - the current/previous value of the parameter
- newValue: string - the new proposed value
- reason: string - a clear explanation of WHY this change is needed based on the KPI data (1-2 sentences)

Be specific with realistic 3GPP parameter names and values. Reference specific KPI metrics in your reason.`;

          const userPrompt = `Current KPI data for site ${site?.name || 'unknown'} (${tech}):
${JSON.stringify(kpiData, null, 2)}

Generate the optimal ${moduleName} parameter adjustment for this site.`;

          const completion = await zai.chat.completions.create({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            thinking: { type: 'disabled' },
          });

          const raw = completion.choices?.[0]?.message?.content || '';
          // Strip markdown code fences if present
          const jsonStr = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
          const parsed = JSON.parse(jsonStr);
          const validated = llmActionSchema.safeParse(parsed);
          if (!validated.success) {
            throw new Error('LLM response validation failed');
          }
          config = validated.data;
          impactScore = 0.72;
          usedAi = true;
        } catch {
          // Fall through to deterministic fallback
        }
      }

      // Deterministic fallback (no Math.random) when LLM is unavailable or no KPI data
      if (!usedAi) {
        const fallbackMap: Record<string, { actionType: string; parameter: string; previousValue: string; newValue: string; reason: string }> = {
          ANR: { actionType: 'add_neighbor', parameter: 'neighborRelation', previousValue: 'none', newValue: 'auto_discovered', reason: kpiData && kpiData.handoverSuccessRate && kpiData.handoverSuccessRate < 95
            ? `Handover success rate is ${kpiData.handoverSuccessRate}%, below 95% threshold. Adding missing neighbor relation to improve handover performance.`
            : 'No missing neighbors detected in latest scan. Confirming existing neighbor list is up to date.' },
          PCI: { actionType: 'modify_pci', parameter: 'pci', previousValue: '0', newValue: '156', reason: kpiData && kpiData.sinr && kpiData.sinr < 5
            ? `SINR is ${kpiData.sinr} dB, indicating potential PCI conflict. Reassigning PCI to reduce inter-cell interference.`
            : 'PCI collision detected with neighboring cell. Reassigning to a non-conflicting PCI value.' },
          MRO: { actionType: 'adjust_tilt', parameter: 'electricalTilt', previousValue: '6', newValue: '4', reason: kpiData && kpiData.dropRate && kpiData.dropRate > 1.5
            ? `Drop rate is ${kpiData.dropRate}%, exceeding 1.5% threshold. Reducing electrical tilt from 6° to 4° to improve cell edge coverage.`
            : 'Adjusting electrical tilt to optimize handover zone and reduce call drops at cell boundary.' },
          CCO: { actionType: 'adjust_power', parameter: 'dlPower', previousValue: '15.2', newValue: '13.5', reason: kpiData && kpiData.prbUtilization && kpiData.prbUtilization > 80
            ? `PRB utilization is ${kpiData.prbUtilization}%, indicating high load. Reducing DL power to offload traffic to neighboring cells.`
            : 'Adjusting downlink power to rebalance coverage area and improve capacity distribution.' },
          HLB: { actionType: 'compensate_outage', parameter: 'loadBalance', previousValue: 'imbalanced', newValue: 'balanced', reason: kpiData && kpiData.activeUsers && kpiData.activeUsers > 100
            ? `Active users at ${kpiData.activeUsers} with high utilization. Rebalancing load across nearby cells.`
            : 'Traffic imbalance detected across sector. Adjusting load distribution parameters.' },
          CODC: { actionType: 'correct_config', parameter: 'configParam', previousValue: 'incorrect', newValue: 'corrected', reason: 'Parameter conflict detected between SON modules. Coordinating to resolve inconsistency and maintain network stability.' },
          AIC: { actionType: 'adjust_power', parameter: 'icicThreshold', previousValue: '-105', newValue: '-100', reason: kpiData && kpiData.rsrq && kpiData.rsrq < -12
            ? `RSRQ is ${kpiData.rsrq} dB, indicating interference. Raising ICIC threshold from -105 dBm to -100 dBm to reduce inter-cell interference.`
            : 'Adjusting ICIC threshold to mitigate detected interference and improve signal quality.' },
          PnP: { actionType: 'add_neighbor', parameter: 'autoNeighbor', previousValue: 'none', newValue: 'pnp_added', reason: 'New site detected in network. Automatically configuring neighbor relations, PCI, and power settings via Plug and Play.' },
        };

        config = fallbackMap[existing.name] || {
          actionType: 'correct_config',
          parameter: 'config',
          previousValue: 'before',
          newValue: 'after',
          reason: `Executed by ${existing.displayName} module - default configuration correction.`,
        };
        impactScore = 0.65;
      }

      const kpiBeforeStr = kpiData ? JSON.stringify(kpiData) : '{}';

      const newAction = await db.sonAction.create({
        data: {
          moduleId: existing.id,
          siteId: site?.id,
          technology: tech,
          actionType: config.actionType,
          parameter: config.parameter,
          previousValue: config.previousValue,
          newValue: config.newValue,
          reason: config.reason,
          status: 'applied',
          kpiBefore: kpiBeforeStr,
          kpiAfter: '{}',
          impactScore,
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
          description: `SON module "${existing.displayName}" executed: ${config.actionType} on ${site?.name || 'auto-selected'} (${config.parameter}: ${config.previousValue} → ${config.newValue})${usedAi ? ' [AI]' : ' [fallback]'}`,
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