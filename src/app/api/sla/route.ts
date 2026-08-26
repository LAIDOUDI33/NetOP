import { db } from '@/lib/db';
import { demoHoursAgo } from '@/lib/demo-time';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);
  try {
    const targets = await db.sLATarget.findMany({ where: { enabled: true }, take: 50 });
    const oneHourAgo = await demoHoursAgo(1);

    // Get latest KPI averages per technology
    const techAvgs = await db.kpiMetric.groupBy({
      by: ['technology'],
      where: { timestamp: { gte: oneHourAgo } },
      _avg: {
        availability: true, dropRate: true, latency: true,
        handoverSuccessRate: true, prbUtilization: true, downloadThroughput: true,
      },
    });

    const avgMap: Record<string, unknown> = {};
    for (const t of techAvgs) {
      avgMap[t.technology] = t._avg;
    }

    const results = targets.map(t => {
      const avg = avgMap[t.technology]?._avg?.[t.metric] ?? avgMap[t.technology]?.[t.metric] ?? 0;
      const actualValue = Number((avg as number).toFixed(2));
      let compliant: boolean;
      let breachPercent = 0;

      if (t.condition === 'gte') {
        compliant = actualValue >= t.targetValue;
        breachPercent = compliant ? 0 : Number((((t.targetValue - actualValue) / t.targetValue) * 100).toFixed(1));
      } else {
        compliant = actualValue <= t.targetValue;
        breachPercent = compliant ? 0 : Number((((actualValue - t.targetValue) / t.targetValue) * 100).toFixed(1));
      }

      return {
        id: t.id, technology: t.technology, metric: t.metric,
        targetValue: t.targetValue, actualValue, condition: t.condition,
        severity: t.severity, compliant, breachPercent,
      };
    });

    const total = results.length;
    const compliant = results.filter(r => r.compliant).length;
    const breached = total - compliant;
    const complianceRate = total > 0 ? Number(((compliant / total) * 100).toFixed(1)) : 0;

    return NextResponse.json({
      targets: results,
      summary: { total, compliant, breached, complianceRate },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}