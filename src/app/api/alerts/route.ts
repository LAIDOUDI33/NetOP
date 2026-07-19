import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const severity = searchParams.get('severity');
  const technology = searchParams.get('technology');
  const showResolved = searchParams.get('resolved') === 'true';

  try {
    const where: any = {};
    if (severity && severity !== 'all') where.severity = severity;
    if (technology && technology !== 'all') where.technology = technology;
    if (!showResolved) where.resolvedAt = null;

    const alerts = await db.alert.findMany({
      where,
      include: { site: { select: { name: true, code: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const rules = await db.alertRule.findMany({ orderBy: { createdAt: 'desc' } });

    // Stats
    const allUnresolved = await db.alert.findMany({ where: { resolvedAt: null } });
    const stats = {
      total: allUnresolved.length,
      critical: allUnresolved.filter(a => a.severity === 'critical').length,
      warning: allUnresolved.filter(a => a.severity === 'warning').length,
      info: allUnresolved.filter(a => a.severity === 'info').length,
      byTech: {
        '2G': allUnresolved.filter(a => a.technology === '2G').length,
        '3G': allUnresolved.filter(a => a.technology === '3G').length,
        '4G': allUnresolved.filter(a => a.technology === '4G').length,
        '5G': allUnresolved.filter(a => a.technology === '5G').length,
      },
    };

    return NextResponse.json({
      alerts: alerts.map(a => ({
        id: a.id,
        siteName: a.site?.name,
        siteCode: a.site?.code,
        technology: a.technology,
        metric: a.metric,
        value: a.value,
        threshold: a.threshold,
        severity: a.severity,
        message: a.message,
        acknowledged: a.acknowledged,
        resolvedAt: a.resolvedAt?.toISOString(),
        createdAt: a.createdAt.toISOString(),
      })),
      rules: rules.map(r => ({
        id: r.id,
        name: r.name,
        technology: r.technology,
        metric: r.metric,
        condition: r.condition,
        threshold: r.threshold,
        severity: r.severity,
        enabled: r.enabled,
      })),
      stats,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertId, action, ruleId, enabled } = body;

    if (action === 'acknowledge' && alertId) {
      await db.alert.update({ where: { id: alertId }, data: { acknowledged: true } });
      return NextResponse.json({ success: true });
    }
    if (action === 'resolve' && alertId) {
      await db.alert.update({ where: { id: alertId }, data: { resolvedAt: new Date() } });
      return NextResponse.json({ success: true });
    }
    if (action === 'toggleRule' && ruleId) {
      await db.alertRule.update({ where: { id: ruleId }, data: { enabled } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}