import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const _auth = await checkApiAuth(request);
  if (!_auth) return authError();
  const technology = searchParams.get('technology') || 'all';
  const metric = searchParams.get('metric') || 'downloadThroughput';
  const now = new Date();
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

  try {
    const where: any = { timestamp: { gte: sixHoursAgo } };
    if (technology !== 'all') where.technology = technology;

    const kpis = await db.kpiMetric.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      select: {
        timestamp: true,
        technology: true,
        siteId: true,
        [metric]: true,
      },
    });

    // Group by technology
    const byTech: Record<string, { timestamps: string[]; values: number[] }> = {};
    for (const kpi of kpis) {
      const val = (kpi as any)[metric];
      if (val == null) continue;
      const tech = kpi.technology;
      if (!byTech[tech]) byTech[tech] = { timestamps: [], values: [] };
      const h = new Date(kpi.timestamp);
      const key = `${h.getHours()}:${String(h.getMinutes()).padStart(2, '0')}`;
      byTech[tech].timestamps.push(key);
      byTech[tech].values.push(Number(val.toFixed(2)));
    }

    // Get a unified timestamp list (union of all tech timestamps, sorted)
    const allTimestamps = [...new Set(Object.values(byTech).flatMap(b => b.timestamps))].sort();

    // Build unified data: map tech -> { values indexed to allTimestamps }
    const data: Record<string, { values: number[]; sites: any[] }> = {};
    for (const [tech, techData] of Object.entries(byTech)) {
      const valueMap = new Map(techData.timestamps.map((t, i) => [t, techData.values[i]]));
      data[tech] = {
        values: allTimestamps.map(t => valueMap.get(t) ?? 0),
        sites: [],
      };
    }

    // Get latest per-site KPI for the metric
    const sites = await db.networkSite.findMany({
      where: technology !== 'all' ? { technology } : {},
      include: {
        kpiMetrics: {
          orderBy: { timestamp: 'desc' },
          take: 1,
          select: { [metric]: true },
        },
      },
    });

    const siteData = sites.map(s => ({
      siteId: s.id,
      siteName: s.name,
      code: s.code,
      technology: s.technology,
      region: s.region,
      status: s.status,
      value: s.kpiMetrics[0] ? Number(((s.kpiMetrics[0] as any)[metric] || 0).toFixed(2)) : 0,
    }));

    // Attach sites to their technology
    for (const site of siteData) {
      if (data[site.technology]) {
        data[site.technology].sites.push(site);
      }
    }

    return NextResponse.json({
      timestamps: allTimestamps,
      data,
      siteData,
      metric,
      technologies: Object.keys(byTech),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}