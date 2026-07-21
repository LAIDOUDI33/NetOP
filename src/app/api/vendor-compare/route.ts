import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const technology = searchParams.get('technology');

  try {
    const techFilter = technology ? `AND s.technology = '${technology}'` : '';

    const rows = await db.$queryRawUnsafe<{
      technology: string;
      vendor: string;
      avgRsrp: number | null;
      avgDownloadThroughput: number | null;
      avgLatency: number | null;
      avgAvailability: number | null;
      avgHandoverSuccessRate: number | null;
      avgDropRate: number | null;
      siteCount: number;
    }[]>(
      `SELECT s.technology, s.vendor,
        AVG(k.rsrp) as avgRsrp,
        AVG(k.downloadThroughput) as avgDownloadThroughput,
        AVG(k.latency) as avgLatency,
        AVG(k.availability) as avgAvailability,
        AVG(k.handoverSuccessRate) as avgHandoverSuccessRate,
        AVG(k.dropRate) as avgDropRate,
        COUNT(*) as siteCount
      FROM NetworkSite s
      INNER JOIN KpiMetric k ON k.siteId = s.id
      WHERE 1=1 ${techFilter}
      GROUP BY s.technology, s.vendor`
    );

    const mapped = rows.map((r) => ({
      technology: r.technology,
      vendor: r.vendor,
      avgRsrp: r.avgRsrp ? Number(r.avgRsrp.toFixed(1)) : null,
      avgDownloadThroughput: r.avgDownloadThroughput ? Number(r.avgDownloadThroughput.toFixed(2)) : null,
      avgLatency: r.avgLatency ? Number(r.avgLatency.toFixed(1)) : null,
      avgAvailability: r.avgAvailability ? Number(r.avgAvailability.toFixed(2)) : null,
      avgHandoverSuccessRate: r.avgHandoverSuccessRate ? Number(r.avgHandoverSuccessRate.toFixed(2)) : null,
      avgDropRate: r.avgDropRate ? Number(r.avgDropRate.toFixed(2)) : null,
      siteCount: r.siteCount,
    }));

    const total = mapped.length;
    const byTech: Record<string, number> = {};
    const byVendor: Record<string, number> = {};
    const totalSites = mapped.reduce((s, r) => s + r.siteCount, 0);

    for (const r of mapped) {
      byTech[r.technology] = (byTech[r.technology] || 0) + 1;
      byVendor[r.vendor] = (byVendor[r.vendor] || 0) + r.siteCount;
    }

    return NextResponse.json({
      matches: mapped,
      summary: {
        total,
        byTech,
        byVendor,
        totalSites,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}