import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError } from '@/lib/api-auth';

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

/** Metric definitions shared across simulation logic */
const METRICS = ['rsrp', 'throughput', 'availability', 'users'] as const;
const UNITS: Record<string, string> = { rsrp: 'dBm', throughput: 'Mbps', availability: '%', users: '' };

type MetricValues = { rsrp: number; throughput: number; availability: number; users: number };

/**
 * Deterministic fallback based on scenario type when LLM is unavailable.
 * Returns realistic before/after values without any randomness.
 */
function getDeterministicValues(scenarioType: string, params: Record<string, unknown>, currentKpi: Partial<MetricValues> | null): { before: MetricValues; after: MetricValues } {
  const base: MetricValues = {
    rsrp: currentKpi?.rsrp ?? -92,
    throughput: currentKpi?.throughput ?? 38,
    availability: currentKpi?.availability ?? 98.2,
    users: currentKpi?.users ?? 1100,
  };

  let after: MetricValues;

  switch (scenarioType) {
    case 'disaster': {
      const severity = (params.severity as string) || 'moderate';
      const factor = severity === 'severe' ? 0.55 : severity === 'critical' ? 0.35 : 0.7;
      after = {
        rsrp: base.rsrp - 14 * factor,
        throughput: base.throughput * factor,
        availability: base.availability * factor,
        users: base.users * factor,
      };
      break;
    }
    case 'capacity_expansion': {
      const additionalCapacity = (params.additionalCapacity as number) || 50;
      const capacityFactor = 1 + (additionalCapacity / 100);
      after = {
        rsrp: base.rsrp + 2,
        throughput: base.throughput * capacityFactor,
        availability: Math.min(99.9, base.availability + 0.8),
        users: base.users * capacityFactor,
      };
      break;
    }
    case 'parameter_change': {
      const changeType = (params.changeType as string) || 'optimization';
      after = {
        rsrp: base.rsrp + (changeType === 'optimization' ? 4 : 1),
        throughput: base.throughput * (changeType === 'optimization' ? 1.25 : 1.08),
        availability: Math.min(99.95, base.availability + (changeType === 'optimization' ? 1.2 : 0.5)),
        users: base.users * (changeType === 'optimization' ? 1.05 : 1.01),
      };
      break;
    }
    case 'maintenance': {
      const duration = (params.duration as number) || 4;
      const impactFactor = Math.max(0.5, 1 - (duration / 48));
      after = {
        rsrp: base.rsrp - 6 * (1 - impactFactor),
        throughput: base.throughput * impactFactor,
        availability: base.availability * impactFactor,
        users: base.users * impactFactor,
      };
      break;
    }
    case 'what_if':
    default: {
      const improvement = (params.improvementTarget as number) || 20;
      const factor = 1 + (improvement / 100);
      after = {
        rsrp: base.rsrp + 3 * (improvement / 100),
        throughput: base.throughput * Math.min(factor, 2.5),
        availability: Math.min(99.99, base.availability + improvement * 0.03),
        users: base.users * Math.min(factor, 3),
      };
      break;
    }
  }

  return { before: base, after };
}

/**
 * Uses the LLM to generate realistic before/after KPI simulation values
 * based on the scenario, parameters, and current site KPI data.
 */
async function generateAISimulation(
  scenarioType: string,
  params: Record<string, unknown>,
  siteInfo: { name: string; code: string; technology: string; region: string } | null,
  currentKpi: Partial<MetricValues> | null,
): Promise<{ before: MetricValues; after: MetricValues }> {
  const zai = await getZai();

  const systemPrompt = `You are a senior telecom network simulation engine for Djezzy (Algeria). You simulate the impact of network scenarios on KPI metrics.

Given a scenario description and the current site KPI data, you must predict realistic BEFORE and AFTER values for these 4 metrics:
- rsrp: RSRP in dBm (typical range: -120 to -60, higher/less negative is better)
- throughput: download throughput in Mbps (typical range: 1 to 200)
- availability: network availability percentage (typical range: 70 to 99.99)
- users: number of active users (typical range: 50 to 5000)

Rules:
- BEFORE values should reflect the current state of the site (use the provided current KPI data as baseline)
- AFTER values should realistically reflect the impact of the described scenario
- For disaster scenarios, AFTER values should be WORSE (lower throughput, lower availability, worse RSRP, fewer users)
- For capacity/maintenance/optimization scenarios, AFTER values should generally IMPROVE
- Values must be physically plausible for a mobile network in Algeria
- Keep changes proportional to the scenario severity/description

You MUST return ONLY valid JSON with exactly these 4 fields, no other text:
{"rsrp": {"before": <number>, "after": <number>}, "throughput": {"before": <number>, "after": <number>}, "availability": {"before": <number>, "after": <number>}, "users": {"before": <number>, "after": <number>}}`;

  const userMessage = JSON.stringify({
    scenarioType,
    parameters: params,
    site: siteInfo || { name: 'Unknown', code: 'N/A', technology: '4G', region: 'Unknown' },
    currentKpi: currentKpi || { rsrp: -92, throughput: 38, availability: 98.2, users: 1100 },
  }, null, 2);

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    thinking: { type: 'disabled' },
  });

  const raw = completion.choices?.[0]?.message?.content || '';

  // Extract JSON from the response (handle potential markdown code blocks)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON object found in LLM response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Validate and extract the 4 metrics
  const before: MetricValues = {
    rsrp: typeof parsed.rsrp?.before === 'number' ? parsed.rsrp.before : -92,
    throughput: typeof parsed.throughput?.before === 'number' ? parsed.throughput.before : 38,
    availability: typeof parsed.availability?.before === 'number' ? parsed.availability.before : 98.2,
    users: typeof parsed.users?.before === 'number' ? parsed.users.before : 1100,
  };

  const after: MetricValues = {
    rsrp: typeof parsed.rsrp?.after === 'number' ? parsed.rsrp.after : -92,
    throughput: typeof parsed.throughput?.after === 'number' ? parsed.throughput.after : 38,
    availability: typeof parsed.availability?.after === 'number' ? parsed.availability.after : 98.2,
    users: typeof parsed.users?.after === 'number' ? parsed.users.after : 1100,
  };

  return { before, after };
}

/**
 * Fetches the latest KPI metrics for a given site from the database.
 */
async function getLatestSiteKpi(siteId: string): Promise<Partial<MetricValues> | null> {
  const latest = await db.kpiMetric.findFirst({
    where: { siteId },
    orderBy: { timestamp: 'desc' },
    select: {
      rsrp: true,
      downloadThroughput: true,
      availability: true,
      activeUsers: true,
    },
  });

  if (!latest) return null;

  return {
    rsrp: latest.rsrp ?? undefined,
    throughput: latest.downloadThroughput ?? undefined,
    availability: latest.availability ?? undefined,
    users: latest.activeUsers ?? undefined,
  };
}

export async function POST(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, remaining } = rateLimit(request, { windowMs: 60_000, max: 10 });
  if (limited) return rateLimitResponse(remaining);
  try {
    const { scenarioId } = await request.json();
    if (!scenarioId) {
      return NextResponse.json({ error: 'scenarioId is required' }, { status: 400 });
    }

    const scenario = await db.digitalTwinScenario.findUnique({
      where: { id: scenarioId },
      include: { targetSite: { select: { id: true, name: true, code: true, technology: true, region: true } } },
    });
    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    const params: Record<string, unknown> = JSON.parse(scenario.parameters);

    // Fetch current KPI data for the target site (if one is assigned)
    let currentKpi: Partial<MetricValues> | null = null;
    if (scenario.targetSiteId) {
      currentKpi = await getLatestSiteKpi(scenario.targetSiteId);
    }

    // Try AI-powered simulation first, fall back to deterministic values
    let before: MetricValues;
    let after: MetricValues;

    try {
      const result = await generateAISimulation(
        scenario.scenarioType,
        params,
        scenario.targetSite
          ? { name: scenario.targetSite.name, code: scenario.targetSite.code, technology: scenario.targetSite.technology, region: scenario.targetSite.region }
          : null,
        currentKpi,
      );
      before = result.before;
      after = result.after;
    } catch (aiError) {
      console.warn('[DT Simulate] AI simulation failed, using deterministic fallback:', aiError);
      const fallback = getDeterministicValues(scenario.scenarioType, params, currentKpi);
      before = fallback.before;
      after = fallback.after;
    }

    // Compute deltas
    const delta: MetricValues = {
      rsrp: after.rsrp - before.rsrp,
      throughput: after.throughput - before.throughput,
      availability: after.availability - before.availability,
      users: after.users - before.users,
    };

    const results = { before, after, delta };

    // Compute impact score based on weighted KPI changes
    const impactScore = parseFloat(
      (delta.rsrp * 0.5 + delta.throughput * 1.2 + delta.availability * 10 + delta.users * 0.005).toFixed(1),
    );

    const [updated] = await Promise.all([
      db.digitalTwinScenario.update({
        where: { id: scenarioId },
        data: {
          status: 'simulated',
          results: JSON.stringify(results),
          impactScore: Math.max(-100, Math.min(100, impactScore)),
        },
        include: { simulationResults: true, targetSite: { select: { id: true, name: true, code: true } } },
      }),
      db.simulationResult.deleteMany({ where: { scenarioId } }),
    ]);

    const simResults = METRICS.map((metric) => {
      const b = before[metric];
      const a = after[metric];
      const d = a - b;
      const pct = b !== 0 ? (d / Math.abs(b)) * 100 : 0;
      return {
        scenarioId,
        metricName: metric,
        beforeValue: parseFloat(b.toFixed(2)),
        afterValue: parseFloat(a.toFixed(2)),
        deltaValue: parseFloat(d.toFixed(2)),
        deltaPct: parseFloat(pct.toFixed(1)),
        unit: UNITS[metric],
        direction: d > 0.5 ? 'improved' : d < -0.5 ? 'degraded' : 'neutral',
      };
    });

    await db.simulationResult.createMany({ data: simResults });

    return NextResponse.json({ scenario: { ...updated, simulationResults: simResults } });
  } catch (error) {
    console.error('[DT Simulate POST]', error);
    return NextResponse.json({ error: 'Simulation failed' }, { status: 500 });
  }
}
