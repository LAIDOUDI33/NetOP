import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getDemoNow } from '@/lib/demo-time';

export async function GET(request: NextRequest) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);
  try {
    // Sites
    const allSites = await db.networkSite.findMany({ select: { technology: true, status: true }, take: 1000 });
    const totalSites = allSites.length;
    const sitesByTech: Record<string, number> = {};
    const sitesByStatus: Record<string, number> = {};
    for (const s of allSites) {
      sitesByTech[s.technology] = (sitesByTech[s.technology] || 0) + 1;
      sitesByStatus[s.status] = (sitesByStatus[s.status] || 0) + 1;
    }

    // Alerts
    const totalAlerts = await db.alert.count();
    const activeAlerts = await db.alert.count({ where: { resolvedAt: null } });

    // Health Score
    const healthAgg = await db.healthScore.aggregate({ _avg: { overallScore: true } });
    const avgHealth = healthAgg._avg.overallScore ?? 0;

    // Incidents
    const totalIncidents = await db.incident.count();
    const openIncidents = await db.incident.count({ where: { status: { in: ['open', 'investigating'] } } });

    // Outages
    const totalOutages = await db.outageEvent.count();
    const activeOutages = await db.outageEvent.count({ where: { status: { in: ['active', 'compensating'] } } });

    // Energy - latest per site
    const latestEnergy = await db.$queryRawUnsafe<{ siteId: string; powerConsumption: number }[]>(
      `SELECT e.siteId, e.powerConsumption FROM EnergyMetric e INNER JOIN (SELECT siteId, MAX(timestamp) as maxTs FROM EnergyMetric GROUP BY siteId) latest ON e.siteId = latest.siteId AND e.timestamp = latest.maxTs`
    );
    const totalEnergyKw = latestEnergy.reduce((s, e) => s + e.powerConsumption / 1000, 0);

    // QoE - avg MOS
    const qoeAgg = await db.qoEMetric.aggregate({ _avg: { mosScore: true } });
    const avgMos = qoeAgg._avg.mosScore ?? 0;

    // SON actions today
    const todayStart = new Date(getDemoNow());
    todayStart.setHours(0, 0, 0, 0);
    const sonActionsToday = await db.sonAction.count({ where: { createdAt: { gte: todayStart } } });

    // NPI
    const npiAgg = await db.npiRecord.aggregate({ _avg: { overallNpi: true } });
    const avgNpi = npiAgg._avg.overallNpi ?? 0;

    // SLA breaches
    const slaBreachCount = await db.incident.count({ where: { slaBreach: true } });

    // ROI realized savings
    const roiAgg = await db.roiRecord.aggregate({
      _sum: { annualSaving: true },
      where: { status: 'realized' },
    });
    const totalRoiSaving = roiAgg._sum.annualSaving ?? 0;

    return NextResponse.json({
      totalSites,
      sitesByTech,
      sitesByStatus,
      totalAlerts,
      activeAlerts,
      avgHealth: Number(avgHealth.toFixed(1)),
      totalIncidents,
      openIncidents,
      totalOutages,
      activeOutages,
      totalEnergyKw: Number(totalEnergyKw.toFixed(2)),
      avgMos: Number(avgMos.toFixed(2)),
      sonActionsToday,
      avgNpi: Number(avgNpi.toFixed(1)),
      slaBreachCount,
      totalRoiSaving: Number(totalRoiSaving.toFixed(0)),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}