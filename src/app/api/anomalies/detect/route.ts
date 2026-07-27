import { db } from '@/lib/db';
import { demoHoursAgo } from '@/lib/demo-time';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const sixHoursAgo = await demoHoursAgo(6);
    const oneHourAgo = await demoHoursAgo(1);

    // Get all KPI metrics from last 6 hours
    const kpis = await db.kpiMetric.findMany({
      where: { timestamp: { gte: sixHoursAgo } },
      orderBy: { timestamp: 'asc' },
      select: {
        siteId: true, technology: true, timestamp: true,
        downloadThroughput: true, latency: true, availability: true,
        sinr: true, dropRate: true, prbUtilization: true,
      },
    });

    // Get latest KPI per site
    const latestKpis = await db.kpiMetric.findMany({
      where: { timestamp: { gte: oneHourAgo } },
      orderBy: { timestamp: 'desc' },
      distinct: ['siteId'],
      select: {
        siteId: true, technology: true,
        downloadThroughput: true, latency: true, availability: true,
        sinr: true, dropRate: true, prbUtilization: true,
      },
    });

    const metrics = ['downloadThroughput', 'latency', 'availability', 'sinr', 'dropRate', 'prbUtilization'] as const;

    // Group historical data by site+metric for Z-score computation
    const siteMetricData: Record<string, Record<string, number[]>> = {};
    for (const kpi of kpis) {
      const key = kpi.siteId;
      if (!siteMetricData[key]) siteMetricData[key] = {};
      for (const m of metrics) {
        const val = (kpi as any)[m];
        if (val != null) {
          if (!siteMetricData[key][m]) siteMetricData[key][m] = [];
          siteMetricData[key][m].push(val);
        }
      }
    }

    // Compute stats and detect anomalies
    const detected: Array<{ siteId: string; technology: string; metric: string; actualValue: number; expectedValue: number; zScore: number; severity: string; description: string }> = [];
    const sites = await db.networkSite.findMany({ select: { id: true, name: true, technology: true } });
    const siteMap = new Map(sites.map(s => [s.id, s]));

    for (const latest of latestKpis) {
      const historical = siteMetricData[latest.siteId];
      if (!historical) continue;

      for (const m of metrics) {
        const values = historical[m];
        const current = (latest as any)[m];
        if (!values || values.length < 3 || current == null) continue;

        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
        if (stdDev === 0) continue;

        const zScore = (current - mean) / stdDev;

        if (Math.abs(zScore) > 2.5) {
          // Check for recent duplicate
          const recentExists = await db.anomalyEvent.count({
            where: {
              siteId: latest.siteId, metric: m,
              createdAt: { gte: oneHourAgo },
            },
          });
          if (recentExists > 0) continue;

          const site = siteMap.get(latest.siteId);
          const direction = zScore > 0 ? 'elevated' : 'degraded';
          const severity = Math.abs(zScore) > 4 ? 'critical' : Math.abs(zScore) > 3 ? 'major' : 'minor';

          detected.push({
            siteId: latest.siteId, technology: latest.technology, metric: m,
            actualValue: current, expectedValue: mean, zScore, severity,
            description: `${m} is ${direction} (z=${zScore.toFixed(2)}) at ${site?.name || 'Unknown'}`,
          });
        }
      }
    }

    // Save detected anomalies
    const saved: any[] = [];
    for (const d of detected) {
      const anomaly = await db.anomalyEvent.create({
        data: {
          siteId: d.siteId, technology: d.technology, metric: d.metric,
          actualValue: d.actualValue, expectedValue: d.expectedValue, zScore: d.zScore,
          severity: d.severity, status: 'detected', description: d.description,
        },
      });
      saved.push(anomaly);
    }

    return NextResponse.json({ detected: saved.length, anomalies: saved });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}