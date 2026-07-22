import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const _auth = await checkApiAuth(request);
  if (!_auth) return authError();
  try {
    // 1. KPI metrics - latest per site
    const allKpis = await db.kpiMetric.findMany({
      orderBy: { timestamp: 'desc' },
      include: { site: { select: { id: true, name: true, code: true, technology: true, region: true, status: true } } },
    });

    const siteKpiMap = new Map<string, (typeof allKpis)[number]>();
    for (const kpi of allKpis) {
      if (!siteKpiMap.has(kpi.siteId)) siteKpiMap.set(kpi.siteId, kpi);
    }
    const latestKpis = Array.from(siteKpiMap.values());

    let totalUsers = 0;
    let totalDownloadMbps = 0;
    let totalUploadMbps = 0;
    let availSum = 0;
    let availCount = 0;
    const techMap: Record<string, { users: number; download: number; upload: number; availability: number; availCount: number; power: number; sites: Set<string> }> = {};
    const siteLoadList: { siteId: string; siteName: string; siteCode: string; technology: string; region: string; prbUtilization: number; activeUsers: number }[] = [];

    for (const kpi of latestKpis) {
      const users = kpi.activeUsers || 0;
      const dl = kpi.downloadThroughput || 0;
      const ul = kpi.uploadThroughput || 0;
      const avail = kpi.availability;
      const prb = kpi.prbUtilization;

      totalUsers += users;
      totalDownloadMbps += dl;
      totalUploadMbps += ul;
      if (avail !== null && avail !== undefined) { availSum += avail; availCount++; }

      const tech = kpi.technology;
      if (!techMap[tech]) techMap[tech] = { users: 0, download: 0, upload: 0, availability: 0, availCount: 0, power: 0, sites: new Set() };
      techMap[tech].users += users;
      techMap[tech].download += dl;
      techMap[tech].upload += ul;
      techMap[tech].sites.add(kpi.siteId);
      if (avail !== null && avail !== undefined) { techMap[tech].availability += avail; techMap[tech].availCount++; }

      if (kpi.site) {
        siteLoadList.push({
          siteId: kpi.siteId,
          siteName: kpi.site.name,
          siteCode: kpi.site.code,
          technology: kpi.technology,
          region: kpi.site.region,
          prbUtilization: prb || 0,
          activeUsers: users,
        });
      }
    }

    siteLoadList.sort((a, b) => b.prbUtilization - a.prbUtilization);
    const topLoadedSites = siteLoadList.slice(0, 5).map((s) => ({
      siteId: s.siteId,
      siteName: s.siteName,
      siteCode: s.siteCode,
      technology: s.technology,
      region: s.region,
      prbUtilization: s.prbUtilization,
      activeUsers: s.activeUsers,
    }));

    const byTech = Object.entries(techMap).map(([technology, stats]) => ({
      technology,
      users: stats.users,
      download: Number(stats.download.toFixed(2)),
      upload: Number(stats.upload.toFixed(2)),
      availability: stats.availCount > 0 ? Number((stats.availability / stats.availCount).toFixed(2)) : 0,
      power: 0, // filled from energy
      sites: stats.sites.size,
    }));

    // 2. Energy metrics - latest per site
    const allEnergy = await db.energyMetric.findMany({
      orderBy: { timestamp: 'desc' },
    });
    const energySiteMap = new Map<string, (typeof allEnergy)[number]>();
    for (const e of allEnergy) {
      if (!energySiteMap.has(e.siteId)) energySiteMap.set(e.siteId, e);
    }
    const latestEnergy = Array.from(energySiteMap.values());

    let totalPowerW = 0;
    let totalCO2kg = 0;
    let sitesInSleep = 0;
    const energyBySiteId = new Map<string, number>();

    for (const e of latestEnergy) {
      totalPowerW += e.powerConsumption;
      totalCO2kg += e.co2Emission || 0;
      if (e.sleepMode || e.mode === 'sleep' || e.mode === 'shutdown') sitesInSleep++;
      energyBySiteId.set(e.siteId, e.powerConsumption);
    }

    // Merge power into byTech
    for (const kpi of latestKpis) {
      const power = energyBySiteId.get(kpi.siteId) || 0;
      if (techMap[kpi.technology]) {
        techMap[kpi.technology].power += power;
      }
    }
    for (const item of byTech) {
      item.power = Number(techMap[item.technology].power.toFixed(1));
    }

    // 3. Alerts - last 10 unresolved
    const recentAlerts = await db.alert.findMany({
      where: { resolvedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { site: { select: { name: true, code: true } } },
    });

    const mappedAlerts = recentAlerts.map((a) => ({
      id: a.id,
      siteName: a.site?.name ?? null,
      siteCode: a.site?.code ?? null,
      technology: a.technology,
      metric: a.metric,
      value: a.value,
      threshold: a.threshold,
      condition: a.condition,
      severity: a.severity,
      message: a.message,
      acknowledged: a.acknowledged,
      createdAt: a.createdAt.toISOString(),
    }));

    // 4. Incidents summary
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [openCount, investigatingCount, todayResolvedCount, slaBreachCount] = await Promise.all([
      db.incident.count({ where: { status: 'open' } }),
      db.incident.count({ where: { status: 'investigating' } }),
      db.incident.count({ where: { status: 'closed', resolvedAt: { gte: todayStart } } }),
      db.incident.count({ where: { slaBreach: true, status: { in: ['open', 'investigating'] } } }),
    ]);

    const activeAlerts = recentAlerts.length;
    const activeIncidents = openCount + investigatingCount;

    return NextResponse.json({
      overview: {
        totalUsers,
        totalDownloadMbps: Number(totalDownloadMbps.toFixed(2)),
        totalUploadMbps: Number(totalUploadMbps.toFixed(2)),
        avgAvailability: availCount > 0 ? Number((availSum / availCount).toFixed(2)) : 0,
        totalPowerW: Number(totalPowerW.toFixed(1)),
        activeAlerts,
        activeIncidents,
      },
      byTech,
      topLoadedSites,
      recentAlerts: mappedAlerts,
      energySummary: {
        totalPowerKw: Number((totalPowerW / 1000).toFixed(2)),
        totalCO2kg: Number(totalCO2kg.toFixed(2)),
        sitesInSleep,
      },
      incidentSummary: {
        open: openCount,
        investigating: investigatingCount,
        todayResolved: todayResolvedCount,
        slaBreaches: slaBreachCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}