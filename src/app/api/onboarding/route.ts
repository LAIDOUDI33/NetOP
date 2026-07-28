import { z } from 'zod';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

const createOnboardingSchema = z.object({
  siteName: z.string().min(1),
  siteCode: z.string().min(1),
  technology: z.string().min(1),
  region: z.string().min(1),
  vendor: z.string().min(1),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  altitude: z.number().optional(),
  frequency: z.string().optional(),
  bandwidth: z.number().optional(),
  maxCapacity: z.number().optional(),
  initialNeighbors: z.array(z.any()).optional(),
});

const patchOnboardingSchema = z.object({
  onboardingId: z.string().min(1),
  action: z.enum(['advance', 'error']),
  status: z.string().optional(),
  errorMessage: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const technology = searchParams.get('technology');

  try {
    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    if (technology && technology !== 'ALL') where.technology = technology;

    const [records, countsByStatus] = await Promise.all([
      db.siteOnboarding.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      db.siteOnboarding.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const c of countsByStatus) {
      statusCounts[c.status] = c._count.status;
    }

    return NextResponse.json({
      records: records.map((r) => ({
        id: r.id,
        siteName: r.siteName,
        siteCode: r.siteCode,
        technology: r.technology,
        region: r.region,
        vendor: r.vendor,
        latitude: r.latitude,
        longitude: r.longitude,
        altitude: r.altitude,
        frequency: r.frequency,
        bandwidth: r.bandwidth,
        maxCapacity: r.maxCapacity,
        status: r.status,
        assignedPci: r.assignedPci,
        assignedFreq: r.assignedFreq,
        initialNeighbors: typeof r.initialNeighbors === 'string' ? JSON.parse(r.initialNeighbors) : r.initialNeighbors,
        kpiBaseline: typeof r.kpiBaseline === 'string' ? JSON.parse(r.kpiBaseline) : r.kpiBaseline,
        errorMessage: r.errorMessage,
        completedAt: r.completedAt?.toISOString(),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      countsByStatus: statusCounts,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);
  try {
    const body = await request.json();
    const parsed = createOnboardingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const {
      siteName,
      siteCode,
      technology,
      region,
      vendor,
      latitude,
      longitude,
      altitude,
      frequency,
      bandwidth,
      maxCapacity,
      initialNeighbors,
    } = parsed.data;

    // Check for duplicate site code
    const existing = await db.siteOnboarding.findUnique({ where: { siteCode } });
    if (existing) {
      return NextResponse.json({ error: `Site code "${siteCode}" already exists` }, { status: 409 });
    }

    const record = await db.siteOnboarding.create({
      data: {
        siteName,
        siteCode,
        technology,
        region,
        vendor,
        latitude: latitude ?? 0,
        longitude: longitude ?? 0,
        altitude: altitude ?? 0,
        frequency: frequency || '',
        bandwidth: bandwidth ?? 0,
        maxCapacity: maxCapacity ?? 0,
        initialNeighbors: initialNeighbors ? JSON.stringify(initialNeighbors) : '[]',
      },
    });

    await db.auditLog.create({
      data: {
        entityType: 'site_onboarding',
        entityId: record.id,
        action: 'create',
        newValue: record.siteCode,
        description: `Site onboarding initiated: "${siteName}" (${siteCode}) — ${technology} in ${region}, vendor: ${vendor}`,
        technology: record.technology,
      },
    });

    return NextResponse.json(
      {
        success: true,
        record: {
          ...record,
          initialNeighbors: JSON.parse(record.initialNeighbors),
          kpiBaseline: JSON.parse(record.kpiBaseline),
          createdAt: record.createdAt.toISOString(),
          updatedAt: record.updatedAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);
  try {
    const body = await request.json();
    const parsed = patchOnboardingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { onboardingId, action, status: newStatus, errorMessage } = parsed.data;

    const existing = await db.siteOnboarding.findUnique({ where: { id: onboardingId } });

    if (!existing) {
      return NextResponse.json({ error: 'Onboarding record not found' }, { status: 404 });
    }

    const statusFlow = ['pending', 'provisioning', 'configuring', 'verifying', 'completed', 'failed'];

    if (action === 'advance') {
      if (!newStatus) {
        // Auto-advance to next status in the flow
        const currentIdx = statusFlow.indexOf(existing.status);
        if (currentIdx === -1 || currentIdx >= statusFlow.length - 2) {
          return NextResponse.json(
            { error: `Cannot advance from status "${existing.status}". Current status must be one of: ${statusFlow.slice(0, -1).join(', ')}` },
            { status: 400 },
          );
        }
        const targetStatus = statusFlow[currentIdx + 1];

        const updated = await db.siteOnboarding.update({
          where: { id: onboardingId },
          data: {
            status: targetStatus,
            completedAt: targetStatus === 'completed' ? new Date() : undefined,
          },
        });

        await db.auditLog.create({
          data: {
            entityType: 'site_onboarding',
            entityId: onboardingId,
            action: 'advance',
            oldValue: existing.status,
            newValue: targetStatus,
            description: `Site onboarding "${existing.siteName}" (${existing.siteCode}) advanced from ${existing.status} to ${targetStatus}`,
            technology: existing.technology,
          },
        });

        return NextResponse.json({
          success: true,
          record: {
            ...updated,
            initialNeighbors: JSON.parse(updated.initialNeighbors),
            kpiBaseline: JSON.parse(updated.kpiBaseline),
            completedAt: updated.completedAt?.toISOString(),
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
          },
        });
      }

      // Advance to a specific status
      if (!statusFlow.includes(newStatus)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${statusFlow.join(', ')}` },
          { status: 400 },
        );
      }

      const updated = await db.siteOnboarding.update({
        where: { id: onboardingId },
        data: {
          status: newStatus,
          completedAt: newStatus === 'completed' ? new Date() : undefined,
        },
      });

      await db.auditLog.create({
        data: {
          entityType: 'site_onboarding',
          entityId: onboardingId,
          action: 'advance',
          oldValue: existing.status,
          newValue: newStatus,
          description: `Site onboarding "${existing.siteName}" (${existing.siteCode}) status changed from ${existing.status} to ${newStatus}`,
          technology: existing.technology,
        },
      });

      return NextResponse.json({
        success: true,
        record: {
          ...updated,
          initialNeighbors: JSON.parse(updated.initialNeighbors),
          kpiBaseline: JSON.parse(updated.kpiBaseline),
          completedAt: updated.completedAt?.toISOString(),
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      });
    }

    if (action === 'error') {
      if (!errorMessage) {
        return NextResponse.json({ error: 'Missing required field: errorMessage for error action' }, { status: 400 });
      }

      const updated = await db.siteOnboarding.update({
        where: { id: onboardingId },
        data: {
          status: 'failed',
          errorMessage,
        },
      });

      await db.auditLog.create({
        data: {
          entityType: 'site_onboarding',
          entityId: onboardingId,
          action: 'error',
          oldValue: existing.status,
          newValue: 'failed',
          description: `Site onboarding "${existing.siteName}" (${existing.siteCode}) failed: ${errorMessage}`,
          technology: existing.technology,
        },
      });

      return NextResponse.json({
        success: true,
        record: {
          ...updated,
          initialNeighbors: JSON.parse(updated.initialNeighbors),
          kpiBaseline: JSON.parse(updated.kpiBaseline),
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      });
    }

    return NextResponse.json({ error: `Invalid action: ${action}. Must be "advance" or "error"` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}