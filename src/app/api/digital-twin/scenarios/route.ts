import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const region = searchParams.get('region');
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '50');

    const where: Record<string, unknown> = {};
    if (type) where.scenarioType = type;
    if (status) where.status = status;
    if (region) where.targetRegion = region;

    const [scenarios, total] = await Promise.all([
      db.digitalTwinScenario.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          targetSite: { select: { id: true, name: true, code: true, region: true } },
          _count: { select: { simulationResults: true } },
        },
      }),
      db.digitalTwinScenario.count({ where }),
    ]);

    return NextResponse.json({ scenarios, total, page, limit });
  } catch (error) {
    console.error('[DT Scenarios GET]', error);
    return NextResponse.json({ error: 'Failed to fetch scenarios' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  try {
    const body = await request.json();
    const { name, description, scenarioType, targetRegion, parameters, targetSiteId } = body;

    if (!name || !scenarioType) {
      return NextResponse.json({ error: 'name and scenarioType are required' }, { status: 400 });
    }

    const scenario = await db.digitalTwinScenario.create({
      data: {
        name,
        description: description ?? '',
        scenarioType,
        targetRegion: targetRegion ?? '',
        targetSiteId: targetSiteId ?? null,
        parameters: parameters ? JSON.stringify(parameters) : '{}',
      },
    });

    return NextResponse.json({ scenario }, { status: 201 });
  } catch (error) {
    console.error('[DT Scenarios POST]', error);
    return NextResponse.json({ error: 'Failed to create scenario' }, { status: 500 });
  }
}
