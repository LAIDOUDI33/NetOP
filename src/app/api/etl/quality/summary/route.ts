import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { checkApiAuth, authError, forbiddenError } from '@/lib/api-auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

// ─── GET — Quality summary ───────────────────────────────
export async function GET(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const user = await checkApiAuth(request);
    const perms = (user.permissions as string[]) ?? [];
    const canView = perms.includes('*:*') || perms.includes('etl:*') || perms.includes('etl:view');
    if (!canView) return forbiddenError();
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHENTICATED') return authError();
    if (e instanceof Error && e.message === 'FORBIDDEN') return forbiddenError();
    return authError();
  }

  try {
    // Fetch all rules (we need them for stats)
    const rules = await db.dataQualityRule.findMany();

    const totalRules = rules.length;
    const enabledRules = rules.filter((r) => r.isEnabled).length;

    // Compute pass rates by severity
    const criticalRules = rules.filter((r) => r.severity === 'critical');
    const warningRules = rules.filter((r) => r.severity === 'warning');
    const infoRules = rules.filter((r) => r.severity === 'info');

    const avg = (arr: typeof rules) =>
      arr.length > 0
        ? +(arr.reduce((s, r) => s + (r.lastPassRate ?? 0), 0) / arr.length).toFixed(1)
        : 100;

    const passRate = {
      overall: avg(rules),
      critical: avg(criticalRules),
      warning: avg(warningRules),
      info: avg(infoRules),
    };

    // Recent failures (last 5)
    const recentFailures = await db.dataQualityResult.findMany({
      where: { passed: false },
      orderBy: { evaluatedAt: 'desc' },
      take: 5,
      include: {
        rule: { select: { name: true, targetModel: true, severity: true } },
      },
    });

    const recentFailuresMapped = recentFailures.map((f) => ({
      id: f.id,
      ruleId: f.ruleId,
      ruleName: f.rule?.name ?? 'Inconnue',
      targetModel: f.rule?.targetModel ?? '',
      severity: f.rule?.severity ?? 'info',
      actualValue: f.actualValue,
      expectedValue: f.expectedValue,
      evaluatedAt: f.evaluatedAt.toISOString(),
    }));

    // Rules grouped by model
    const modelMap: Record<string, { total: number; passRate: number }> = {};
    for (const r of rules) {
      if (!modelMap[r.targetModel]) {
        modelMap[r.targetModel] = { total: 0, passRate: 0 };
      }
      modelMap[r.targetModel].total += 1;
      modelMap[r.targetModel].passRate += r.lastPassRate ?? 0;
    }
    const rulesByModel: Record<string, { total: number; passRate: number }> = {};
    for (const [model, stats] of Object.entries(modelMap)) {
      rulesByModel[model] = {
        total: stats.total,
        passRate: +(stats.passRate / stats.total).toFixed(1),
      };
    }

    // Trend: last 24 hours of results
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentResults = await db.dataQualityResult.findMany({
      where: { evaluatedAt: { gte: twentyFourHoursAgo } },
      select: { evaluatedAt: true, passed: true },
    });

    // Group by hour
    const hourBuckets: Record<string, { total: number; passed: number }> = {};
    for (const r of recentResults) {
      const hour = r.evaluatedAt.toISOString().slice(0, 13).replace('T', ' ');
      if (!hourBuckets[hour]) {
        hourBuckets[hour] = { total: 0, passed: 0 };
      }
      hourBuckets[hour].total += 1;
      if (r.passed) hourBuckets[hour].passed += 1;
    }

    // Build 24 data points (fill gaps with last known rate)
    const now = new Date();
    const trend: { date: string; passRate: number }[] = [];
    let lastRate = passRate.overall;
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}`;
      const bucket = hourBuckets[key];
      if (bucket && bucket.total > 0) {
        lastRate = +(bucket.passed / bucket.total * 100).toFixed(1);
      }
      trend.push({
        date: key,
        passRate: lastRate,
      });
    }

    return NextResponse.json({
      totalRules,
      enabledRules,
      passRate,
      recentFailures: recentFailuresMapped,
      rulesByModel,
      trend,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
