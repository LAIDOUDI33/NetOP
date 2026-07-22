import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const _auth = await checkApiAuth(request);
  if (!_auth) return authError();
  const technology = searchParams.get('technology');
  const mode = searchParams.get('mode');
  const siteId = searchParams.get('siteId');

  try {
    const where: Record<string, unknown> = {};
    if (technology) where.technology = technology;
    if (mode) where.mode = mode;
    if (siteId) where.siteId = siteId;

    const metrics = await db.energyMetric.findMany({
      where,
      include: { site: { select: { name: true, code: true, region: true, technology: true } } },
      orderBy: siteId ? { timestamp: 'asc' } : { timestamp: 'desc' },
    });

    // If siteId provided, return timeline format
    if (siteId) {
      const mapped = metrics.map((m) => ({
        id: m.id,
        siteId: m.siteId,
        siteName: m.site?.name ?? null,
        technology: m.technology,
        timestamp: m.timestamp.toISOString(),
        powerConsumption: m.powerConsumption,
        energyConsumed: m.energyConsumed,
        activeUsers: m.activeUsers,
        trafficLoad: m.trafficLoad,
        temperature: m.temperature,
        sleepMode: m.sleepMode,
        mode: m.mode,
        co2Emission: m.co2Emission,
        solarGeneration: m.solarGeneration,
        batteryLevel: m.batteryLevel,
        createdAt: m.createdAt.toISOString(),
      }));

      return NextResponse.json({ metrics: mapped, summary: null });
    }

    // Default: return latest per site with full summary
    const siteMap = new Map<string, (typeof metrics)[number]>();
    for (const m of metrics) {
      if (!siteMap.has(m.siteId)) siteMap.set(m.siteId, m);
    }
    const uniqueMetrics = Array.from(siteMap.values());

    const mapped = uniqueMetrics.map((m) => ({
      id: m.id,
      siteId: m.siteId,
      siteName: m.site?.name ?? null,
      siteCode: m.site?.code ?? null,
      technology: m.technology,
      timestamp: m.timestamp.toISOString(),
      powerConsumption: m.powerConsumption,
      energyConsumed: m.energyConsumed,
      activeUsers: m.activeUsers,
      trafficLoad: m.trafficLoad,
      temperature: m.temperature,
      sleepMode: m.sleepMode,
      mode: m.mode,
      co2Emission: m.co2Emission,
      solarGeneration: m.solarGeneration,
      batteryLevel: m.batteryLevel,
      createdAt: m.createdAt.toISOString(),
    }));

    const totalSites = uniqueMetrics.length;
    let totalPowerKw = 0;
    let totalCO2kg = 0;
    let tempSum = 0;
    let tempCount = 0;
    let sleepModeCount = 0;
    const byTech: Record<string, number> = {};
    const byMode: Record<string, number> = {};
    let normalPower: number[] = [];
    let nonNormalPower: number[] = [];

    for (const m of uniqueMetrics) {
      totalPowerKw += m.powerConsumption / 1000;
      totalCO2kg += m.co2Emission || 0;
      if (m.temperature !== null && m.temperature !== undefined) {
        tempSum += m.temperature;
        tempCount++;
      }
      if (m.sleepMode) sleepModeCount++;
      byTech[m.technology] = (byTech[m.technology] || 0) + 1;
      byMode[m.mode] = (byMode[m.mode] || 0) + 1;
      if (m.mode === 'normal') {
        normalPower.push(m.powerConsumption);
      } else {
        nonNormalPower.push(m.powerConsumption);
      }
    }

    const avgNormal = normalPower.length > 0 ? normalPower.reduce((a, b) => a + b, 0) / normalPower.length : 0;
    const avgNonNormal = nonNormalPower.length > 0 ? nonNormalPower.reduce((a, b) => a + b, 0) / nonNormalPower.length : 0;
    const energySavingPct = avgNormal > 0 ? Number(((1 - avgNonNormal / avgNormal) * 100).toFixed(1)) : 0;

    return NextResponse.json({
      metrics: mapped,
      summary: {
        totalSites,
        totalPowerKw: Number(totalPowerKw.toFixed(2)),
        totalCO2kg: Number(totalCO2kg.toFixed(2)),
        avgTemp: tempCount > 0 ? Number((tempSum / tempCount).toFixed(1)) : 0,
        sleepModeCount,
        energySavingPct,
        byTech,
        byMode,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}