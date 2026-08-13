import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const { limited, remaining } = rateLimit(request, { windowMs: 60_000, max: 60 });
  if (limited) return rateLimitResponse(remaining);
  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const component = searchParams.get('component');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (severity) where.severity = severity;
    if (component) where.component = component;
    if (status) where.status = status;

    const faults = await db.faultPrediction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const results = faults.map((f) => ({
      id: f.id,
      siteId: f.siteId,
      technology: f.technology,
      component: f.component,
      faultType: f.faultType,
      probability: f.probability,
      severity: f.severity,
      status: f.status,
      confidence: f.confidence,
      indicators: JSON.parse(f.indicators),
      recommendedAction: f.recommendedAction,
      estimatedTimeToFail: f.estimatedTimeToFail,
      createdAt: f.createdAt.toISOString(),
    }));

    // Severity distribution
    const severityDist: Record<string, number> = {};
    for (const f of faults) {
      severityDist[f.severity] = (severityDist[f.severity] || 0) + 1;
    }

    // Status distribution
    const statusDist: Record<string, number> = {};
    for (const f of faults) {
      statusDist[f.status] = (statusDist[f.status] || 0) + 1;
    }

    return NextResponse.json({
      total: faults.length,
      severityDistribution: severityDist,
      statusDistribution: statusDist,
      faults: results,
    });
  } catch (error) {
    console.error('[predictive/faults] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load fault predictions' },
      { status: 500 }
    );
  }
}
