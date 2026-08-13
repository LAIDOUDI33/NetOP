import { db } from '@/lib/db';
import { demoHoursAgo, getDemoNow } from '@/lib/demo-time';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('siteId');
  const technology = searchParams.get('technology');
  const now = await getDemoNow();
  const sixHoursAgo = await demoHoursAgo(6);

  try {
    const techFilter = technology && technology !== 'all' ? technology : undefined;

    // ── Single-site timeline mode ──
    if (siteId) {
      const metrics = await db.qoEMetric.findMany({
        where: {
          siteId,
          ...(techFilter ? { technology: techFilter } : {}),
          timestamp: { gte: sixHoursAgo },
        },
        orderBy: { timestamp: 'asc' },
        take: 500,
      });

      // Bucket into hourly intervals
      const buckets: Record<string, typeof metrics> = {};
      for (const m of metrics) {
        const h = new Date(m.timestamp);
        const bucketKey = `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}T${String(h.getHours()).padStart(2, '0')}:00:00`;
        if (!buckets[bucketKey]) buckets[bucketKey] = [];
        buckets[bucketKey].push(m);
      }

      const timeline = Object.entries(buckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([bucket, items]) => {
          const avg = (field: keyof (typeof items)[0]) => {
            const vals = items
              .map((i) => i[field])
              .filter((v): v is number => typeof v === 'number' && !isNaN(v));
            return vals.length > 0
              ? Number((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2))
              : null;
          };
          const sum = (field: keyof (typeof items)[0]) =>
            items.reduce((s, i) => s + (typeof i[field] === 'number' ? (i[field] as number) : 0), 0);

          return {
            bucket,
            technology: items[0]?.technology ?? '',
            sampleCount: items.length,
            avgMosScore: avg('mosScore'),
            avgDataRateExperienced: avg('dataRateExperienced'),
            avgCallSetupTime: avg('callSetupTime'),
            avgCallDropRate: avg('callDropRate'),
            avgWebPageLoadTime: avg('webPageLoadTime'),
            avgVideoStartTime: avg('videoStartTime'),
            avgPingLatency: avg('pingLatency'),
            avgJitterExperience: avg('jitterExperience'),
            avgSatisfactionIndex: avg('satisfactionIndex'),
            totalSubscriberCount: sum('subscriberCount'),
            totalComplaintCount: sum('complaintCount'),
          };
        });

      const site = await db.networkSite.findUnique({
        where: { id: siteId },
        select: { id: true, name: true, code: true, technology: true, region: true },
      });

      return NextResponse.json({
        mode: 'timeline',
        site,
        timeline,
        from: sixHoursAgo.toISOString(),
        to: now.toISOString(),
      });
    }

    // ── All-sites summary mode ──
    const sites = await db.networkSite.findMany({
      where: techFilter ? { technology: techFilter } : {},
      include: {
        qoeMetrics: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
      take: 1000,
    });

    const siteSummaries = sites
      .filter((s) => s.qoeMetrics.length > 0)
      .map((s) => {
        const m = s.qoeMetrics[0];
        return {
          siteId: s.id,
          siteName: s.name,
          siteCode: s.code,
          technology: s.technology,
          region: s.region,
          mosScore: m.mosScore ?? null,
          dataRateExperienced: m.dataRateExperienced ?? null,
          callSetupTime: m.callSetupTime ?? null,
          callDropRate: m.callDropRate ?? null,
          webPageLoadTime: m.webPageLoadTime ?? null,
          videoStartTime: m.videoStartTime ?? null,
          pingLatency: m.pingLatency ?? null,
          jitterExperience: m.jitterExperience ?? null,
          satisfactionIndex: m.satisfactionIndex ?? null,
          subscriberCount: m.subscriberCount ?? 0,
          complaintCount: m.complaintCount ?? 0,
          timestamp: m.timestamp.toISOString(),
        };
      });

    // Average MOS by technology
    const mosByTech: Record<string, { sum: number; count: number }> = {};
    for (const s of siteSummaries) {
      if (s.mosScore == null) continue;
      if (!mosByTech[s.technology]) mosByTech[s.technology] = { sum: 0, count: 0 };
      mosByTech[s.technology].sum += s.mosScore;
      mosByTech[s.technology].count++;
    }
    const avgMosByTech: Record<string, number> = {};
    for (const [tech, { sum, count }] of Object.entries(mosByTech)) {
      avgMosByTech[tech] = count > 0 ? Number((sum / count).toFixed(2)) : 0;
    }

    // Worst 5 sites by satisfaction (lowest first)
    const worstSites = [...siteSummaries]
      .filter((s) => s.satisfactionIndex != null)
      .sort((a, b) => (a.satisfactionIndex ?? 0) - (b.satisfactionIndex ?? 0))
      .slice(0, 5);

    // Total complaints
    const totalComplaints = siteSummaries.reduce((sum, s) => sum + s.complaintCount, 0);

    // Average satisfaction by technology
    const satByTech: Record<string, { sum: number; count: number }> = {};
    for (const s of siteSummaries) {
      if (s.satisfactionIndex == null) continue;
      if (!satByTech[s.technology]) satByTech[s.technology] = { sum: 0, count: 0 };
      satByTech[s.technology].sum += s.satisfactionIndex;
      satByTech[s.technology].count++;
    }
    const avgSatisfactionByTech: Record<string, number> = {};
    for (const [tech, { sum, count }] of Object.entries(satByTech)) {
      avgSatisfactionByTech[tech] = count > 0 ? Number((sum / count).toFixed(2)) : 0;
    }

    return NextResponse.json({
      mode: 'summary',
      sites: siteSummaries,
      summary: {
        totalSites: siteSummaries.length,
        avgMosByTech,
        avgSatisfactionByTech,
        worstSitesBySatisfaction: worstSites,
        totalComplaints,
      },
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}