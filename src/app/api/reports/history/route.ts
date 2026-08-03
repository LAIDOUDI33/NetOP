import { z } from 'zod';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { checkApiAuth, authError, forbiddenError } from '@/lib/api-auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

const createReportSchema = z.object({
  templateId: z.string().min(1),
  scheduleId: z.string().optional(),
  name: z.string().min(1, 'Le nom est requis'),
  type: z.string().min(1),
  format: z.string().optional(),
  fileSizeBytes: z.number().int().min(0).optional(),
  status: z.string().optional(),
  error: z.string().optional(),
});

// ────────────────────────────────────────────
// GET — List generated reports
// ────────────────────────────────────────────
export async function GET(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const user = await checkApiAuth(request);
    const perms = (user.permissions as string[]) ?? [];
    const canView = perms.includes('*:*') || perms.includes('reports:*') || perms.includes('reports:view');
    if (!canView) return forbiddenError();
  } catch (e: any) {
    if (e.message === 'UNAUTHENTICATED') return authError();
    if (e.message === 'FORBIDDEN') return forbiddenError();
    return authError();
  }

  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

    const where: Record<string, any> = {};
    if (templateId) where.templateId = templateId;

    const [reports, total] = await Promise.all([
      db.generatedReport.findMany({
        where,
        include: {
          template: { select: { name: true, type: true } },
          schedule: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.generatedReport.count({ where }),
    ]);

    const result = reports.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      format: r.format,
      fileSizeBytes: r.fileSizeBytes,
      status: r.status,
      error: r.error,
      generatedBy: r.generatedBy,
      createdAt: r.createdAt.toISOString(),
      template: {
        name: r.template.name,
        type: r.template.type,
      },
      schedule: r.schedule
        ? { name: r.schedule.name }
        : null,
    }));

    return NextResponse.json({ reports: result, total });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ────────────────────────────────────────────
// POST — Record a generated report
// ────────────────────────────────────────────
export async function POST(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const user = await checkApiAuth(request);
    const perms = (user.permissions as string[]) ?? [];
    const canCreate = perms.includes('*:*') || perms.includes('reports:*') || perms.includes('reports:create');
    if (!canCreate) return forbiddenError();
  } catch (e: any) {
    if (e.message === 'UNAUTHENTICATED') return authError();
    if (e.message === 'FORBIDDEN') return forbiddenError();
    return authError();
  }

  try {
    const body = await request.json();
    const parsed = createReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { templateId, scheduleId, name, type, format, fileSizeBytes, status, error } = parsed.data;

    const user = await checkApiAuth(request);

    const report = await db.generatedReport.create({
      data: {
        templateId,
        scheduleId: scheduleId ?? null,
        name,
        type,
        format: format ?? 'pdf',
        fileSizeBytes: fileSizeBytes ?? 0,
        status: status ?? 'completed',
        error: error ?? null,
        generatedBy: user.id as string,
      },
    });

    return NextResponse.json(
      {
        id: report.id,
        name: report.name,
        type: report.type,
        format: report.format,
        fileSizeBytes: report.fileSizeBytes,
        status: report.status,
        error: report.error,
        generatedBy: report.generatedBy,
        createdAt: report.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
