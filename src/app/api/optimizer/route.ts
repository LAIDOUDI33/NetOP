import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { demoHoursAgo } from '@/lib/demo-time';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError } from '@/lib/api-auth';

const optimizerSchema = z.object({
  prompt: z.string().min(1),
  healthSummary: z.array(z.any()).optional(),
});

export async function GET(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);
  try {
    const optimizations = await db.optimizationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Get network health summary for context
    const sites = await db.networkSite.findMany({ take: 1000 });
    const oneHourAgo = await demoHoursAgo(1);

    const latestKpis = await db.kpiMetric.groupBy({
      by: ['technology'],
      where: { timestamp: { gte: oneHourAgo } },
      _avg: {
        downloadThroughput: true,
        uploadThroughput: true,
        latency: true,
        availability: true,
        activeUsers: true,
        dropRate: true,
        sinr: true,
      },
    });

    const healthSummary = latestKpis.map(k => ({
      technology: k.technology,
      avgThroughput: Number((k._avg.downloadThroughput || 0).toFixed(2)),
      avgLatency: Number((k._avg.latency || 0).toFixed(1)),
      avgAvailability: Number((k._avg.availability || 0).toFixed(2)),
      avgDropRate: Number((k._avg.dropRate || 0).toFixed(2)),
      avgSinr: Number((k._avg.sinr || 0).toFixed(2)),
      avgUsers: Math.round(k._avg.activeUsers || 0),
      sites: sites.filter(s => s.technology === k.technology).length,
      degradedSites: sites.filter(s => s.technology === k.technology && s.status === 'degraded').length,
      downSites: sites.filter(s => s.technology === k.technology && s.status === 'down').length,
    }));

    return NextResponse.json({
      optimizations: optimizations.map(o => ({
        id: o.id,
        technology: o.technology,
        siteName: o.siteName,
        category: o.category,
        issue: o.issue,
        recommendation: o.recommendation,
        impact: o.impact,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
      })),
      healthSummary,
    });
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
    const parsed = optimizerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { prompt, healthSummary } = parsed.data;

    // Use LLM SDK for AI-powered optimization
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const healthContext = healthSummary
      ? `\n\nCurrent Network Health Summary:\n${JSON.stringify(healthSummary, null, 2)}`
      : '';

    const systemPrompt = `You are an expert Mobile Network Optimization Engineer with deep expertise in 2G (GSM/GPRS/EDGE), 3G (UMTS/HSPA/HSPA+), 4G (LTE/LTE-A), and 5G (NR/NSA/SA) technologies.
You provide actionable, specific optimization recommendations based on network KPIs and conditions.
Focus on:
- RF optimization (antenna tilt, azimuth, power)
- Capacity management (carrier aggregation, load balancing)
- Handover optimization (thresholds, hysteresis, neighbor lists)
- Interference mitigation (PCI planning, ICIC, frequency optimization)
- Parameter tuning (specific 3GPP parameters)

Be specific with parameter names, values, and expected impact.
Format your response with clear sections and bullet points.
Keep the response under 500 words.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt + healthContext },
      ],
      thinking: { type: 'disabled' },
    });

    const response = completion.choices?.[0]?.message?.content || 'No response generated.';

    // Save to optimization log
    await db.optimizationLog.create({
      data: {
        technology: 'ALL',
        category: 'ai-recommendation',
        issue: `AI Query: ${prompt.substring(0, 200)}`,
        recommendation: response,
        impact: 'medium',
        status: 'pending',
      },
    });

    return NextResponse.json({ response });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}