import { z } from 'zod';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError } from '@/lib/api-auth';

const createIncidentSchema = z.object({
  title: z.string().min(1),
  technology: z.string().min(1),
  severity: z.string().min(1),
  description: z.string().optional(),
  siteId: z.string().optional(),
  category: z.string().optional(),
  priority: z.number().int().min(1).max(10).optional(),
  assignedTo: z.string().optional(),
  mttrTarget: z.number().optional(),
  tags: z.array(z.string()).optional(),
});

const patchIncidentSchema = z.object({
  id: z.string().min(1),
  action: z.enum(['resolve', 'assign', 'investigate']),
  assignedTo: z.string().optional(),
  rootCause: z.string().optional(),
  resolution: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);
  const { searchParams } = new URL(request.url);
  const technology = searchParams.get('technology');
  const severity = searchParams.get('severity');
  const status = searchParams.get('status');
  const category = searchParams.get('category');

  try {
    const where: Record<string, unknown> = {};
    if (technology) where.technology = technology;
    if (severity) where.severity = severity;
    if (status) where.status = status;
    if (category) where.category = category;

    const incidents = await db.incident.findMany({
      where,
      include: { site: { select: { name: true, code: true, region: true, technology: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const mapped = incidents.map((inc) => ({
      id: inc.id,
      title: inc.title,
      description: inc.description,
      technology: inc.technology,
      siteId: inc.siteId,
      siteName: inc.site?.name ?? null,
      siteCode: inc.site?.code ?? null,
      severity: inc.severity,
      status: inc.status,
      category: inc.category,
      priority: inc.priority,
      assignedTo: inc.assignedTo,
      reportedBy: inc.reportedBy,
      mttrTarget: inc.mttrTarget,
      mtbfValue: inc.mtbfValue,
      rootCause: inc.rootCause,
      resolution: inc.resolution,
      affectedSites: JSON.parse(inc.affectedSites || '[]'),
      relatedAlerts: JSON.parse(inc.relatedAlerts || '[]'),
      tags: JSON.parse(inc.tags || '[]'),
      slaBreach: inc.slaBreach,
      resolvedAt: inc.resolvedAt?.toISOString() ?? null,
      createdAt: inc.createdAt.toISOString(),
      updatedAt: inc.updatedAt.toISOString(),
    }));

    const total = incidents.length;
    const bySeverity: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let mttrSum = 0;
    let mttrCount = 0;
    let slaBreaches = 0;

    for (const inc of incidents) {
      bySeverity[inc.severity] = (bySeverity[inc.severity] || 0) + 1;
      byStatus[inc.status] = (byStatus[inc.status] || 0) + 1;
      byCategory[inc.category] = (byCategory[inc.category] || 0) + 1;
      if (inc.resolvedAt && inc.createdAt) {
        const actualMinutes = (inc.resolvedAt.getTime() - inc.createdAt.getTime()) / 60000;
        mttrSum += actualMinutes;
        mttrCount++;
      }
      if (inc.slaBreach) slaBreaches++;
    }

    return NextResponse.json({
      incidents: mapped,
      summary: {
        total,
        bySeverity,
        byStatus,
        byCategory,
        avgMTTR: mttrCount > 0 ? Number((mttrSum / mttrCount).toFixed(1)) : 0,
        slaBreaches,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);
  try {
    const body = await request.json();
    const parsed = createIncidentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { title, technology, severity, description, siteId, category, priority, assignedTo, mttrTarget, tags } = parsed.data;

    const incident = await db.incident.create({
      data: {
        title,
        description: description || '',
        technology,
        siteId: siteId || null,
        severity,
        status: 'open',
        category: category || 'network',
        priority: priority || 5,
        assignedTo: assignedTo || null,
        reportedBy: 'system',
        mttrTarget: mttrTarget || null,
        affectedSites: siteId ? JSON.stringify([siteId]) : '[]',
        relatedAlerts: '[]',
        tags: tags ? JSON.stringify(tags) : '[]',
      },
    });

    return NextResponse.json(
      {
        id: incident.id,
        title: incident.title,
        description: incident.description,
        technology: incident.technology,
        siteId: incident.siteId,
        severity: incident.severity,
        status: incident.status,
        category: incident.category,
        priority: incident.priority,
        assignedTo: incident.assignedTo,
        reportedBy: incident.reportedBy,
        mttrTarget: incident.mttrTarget,
        mtbfValue: incident.mtbfValue,
        rootCause: incident.rootCause,
        resolution: incident.resolution,
        affectedSites: JSON.parse(incident.affectedSites || '[]'),
        relatedAlerts: JSON.parse(incident.relatedAlerts || '[]'),
        tags: JSON.parse(incident.tags || '[]'),
        slaBreach: incident.slaBreach,
        resolvedAt: incident.resolvedAt?.toISOString() ?? null,
        createdAt: incident.createdAt.toISOString(),
        updatedAt: incident.updatedAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);
  try {
    const body = await request.json();
    const parsed = patchIncidentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { id, action, assignedTo, rootCause, resolution } = parsed.data;

    const existing = await db.incident.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    if (action === 'resolve') {
      if (!rootCause || !resolution) {
        return NextResponse.json({ error: 'Action "resolve" requires rootCause and resolution' }, { status: 400 });
      }
      data.status = 'closed';
      data.resolvedAt = new Date();
      data.rootCause = rootCause;
      data.resolution = resolution;
    } else if (action === 'assign') {
      if (!assignedTo) {
        return NextResponse.json({ error: 'Action "assign" requires assignedTo' }, { status: 400 });
      }
      data.assignedTo = assignedTo;
    } else if (action === 'investigate') {
      data.status = 'investigating';
    } else {
      return NextResponse.json({ error: 'Invalid action. Use: resolve, assign, or investigate' }, { status: 400 });
    }

    const incident = await db.incident.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      id: incident.id,
      title: incident.title,
      description: incident.description,
      technology: incident.technology,
      siteId: incident.siteId,
      severity: incident.severity,
      status: incident.status,
      category: incident.category,
      priority: incident.priority,
      assignedTo: incident.assignedTo,
      reportedBy: incident.reportedBy,
      mttrTarget: incident.mttrTarget,
      mtbfValue: incident.mtbfValue,
      rootCause: incident.rootCause,
      resolution: incident.resolution,
      affectedSites: JSON.parse(incident.affectedSites || '[]'),
      relatedAlerts: JSON.parse(incident.relatedAlerts || '[]'),
      tags: JSON.parse(incident.tags || '[]'),
      slaBreach: incident.slaBreach,
      resolvedAt: incident.resolvedAt?.toISOString() ?? null,
      createdAt: incident.createdAt.toISOString(),
      updatedAt: incident.updatedAt.toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}