import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, remaining } = rateLimit(request, { windowMs: 60_000, max: 10 });
  if (limited) return rateLimitResponse(remaining);
  try {
    const { scenarioId } = await request.json();
    if (!scenarioId) {
      return NextResponse.json({ error: 'scenarioId is required' }, { status: 400 });
    }

    const scenario = await db.digitalTwinScenario.findUnique({ where: { id: scenarioId } });
    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    const params = JSON.parse(scenario.parameters);
    const isDisaster = scenario.scenarioType === 'disaster';

    const before = {
      rsrp: -95 + Math.random() * 10,
      throughput: 25 + Math.random() * 30,
      availability: 97 + Math.random() * 2.5,
      users: 500 + Math.random() * 1500,
    };
    const after = {
      rsrp: isDisaster ? -105 - Math.random() * 10 : -90 - Math.random() * 8,
      throughput: isDisaster ? 10 + Math.random() * 15 : 35 + Math.random() * 35,
      availability: isDisaster ? 85 + Math.random() * 10 : 98.5 + Math.random() * 1.5,
      users: isDisaster ? 300 + Math.random() * 800 : 800 + Math.random() * 2000,
    };
    const delta = {
      rsrp: after.rsrp - before.rsrp,
      throughput: after.throughput - before.throughput,
      availability: after.availability - before.availability,
      users: after.users - before.users,
    };

    const results = { before, after, delta };
    const impactScore = isDisaster
      ? -30 - Math.random() * 50
      : 10 + Math.random() * 60;

    const [updated] = await Promise.all([
      db.digitalTwinScenario.update({
        where: { id: scenarioId },
        data: {
          status: 'simulated',
          results: JSON.stringify(results),
          impactScore: parseFloat(impactScore.toFixed(1)),
        },
        include: { simulationResults: true, targetSite: { select: { id: true, name: true, code: true } } },
      }),
      db.simulationResult.deleteMany({ where: { scenarioId } }),
    ]);

    const metrics = ['rsrp', 'throughput', 'availability', 'users'];
    const units = ['dBm', 'Mbps', '%', ''];
    const simResults = metrics.map((metric) => {
      const b = before[metric as keyof typeof before];
      const a = after[metric as keyof typeof after];
      const d = a - b;
      const pct = b !== 0 ? (d / Math.abs(b)) * 100 : 0;
      return {
        scenarioId,
        metricName: metric,
        beforeValue: parseFloat(b.toFixed(2)),
        afterValue: parseFloat(a.toFixed(2)),
        deltaValue: parseFloat(d.toFixed(2)),
        deltaPct: parseFloat(pct.toFixed(1)),
        unit: units[metrics.indexOf(metric)],
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
