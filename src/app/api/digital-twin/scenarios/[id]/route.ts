import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await checkApiAuth(request); } catch { return authError(); }
  try {
    const { id } = await params;
    const scenario = await db.digitalTwinScenario.findUnique({
      where: { id },
      include: {
        targetSite: { select: { id: true, name: true, code: true, region: true, technology: true } },
        simulationResults: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    return NextResponse.json({ scenario });
  } catch (error) {
    console.error('[DT Scenario GET]', error);
    return NextResponse.json({ error: 'Failed to fetch scenario' }, { status: 500 });
  }
}
