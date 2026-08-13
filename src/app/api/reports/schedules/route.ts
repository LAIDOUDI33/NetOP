import { z } from 'zod';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { checkApiAuth, authError, forbiddenError } from '@/lib/api-auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

const createScheduleSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  templateId: z.string().min(1, 'templateId est requis'),
  cronExpr: z.string().min(1, 'Expression cron requise'),
  timezone: z.string().optional(),
  format: z.string().optional(),
  recipients: z.string().optional(), // JSON string of email array
});

const patchScheduleSchema = z.object({
  scheduleId: z.string().min(1),
  isEnabled: z.boolean().optional(),
});

const deleteScheduleSchema = z.object({
  scheduleId: z.string().min(1),
});

// ────────────────────────────────────────────
// Helper: compute nextRunAt from cron expression (simple parser)
// Supports: "0 9 * * *" (daily), "0 9 * * 1" (weekly Mon), etc.
// ────────────────────────────────────────────
function computeNextRun(cronExpr: string): Date {
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length < 5) return new Date();

  const minute = parseInt(parts[0], 10) || 0;
  const hour = parseInt(parts[1], 10) || 0;
  const dayOfMonth = parts[2];
  const month = parts[3];
  const dayOfWeek = parts[4];

  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(hour, minute, 0, 0);

  // If we already passed today's time, start from tomorrow
  if (candidate <= now) {
    candidate.setDate(candidate.getDate() + 1);
  }

  // If a specific day of week is given (0=Sun, 1=Mon, ..., 6=Sat)
  if (dayOfWeek !== '*') {
    const targetDow = parseInt(dayOfWeek, 10);
    if (!isNaN(targetDow)) {
      const currentDow = candidate.getDay();
      let diff = targetDow - currentDow;
      if (diff <= 0) diff += 7;
      candidate.setDate(candidate.getDate() + diff);
    }
  }

  // If specific day of month
  if (dayOfMonth !== '*') {
    const targetDom = parseInt(dayOfMonth, 10);
    if (!isNaN(targetDom)) {
      candidate.setDate(targetDom);
      if (candidate <= now) {
        candidate.setMonth(candidate.getMonth() + 1);
      }
    }
  }

  // If specific month
  if (month !== '*') {
    const targetMonth = parseInt(month, 10) - 1; // 0-indexed
    if (!isNaN(targetMonth)) {
      if (candidate.getMonth() < targetMonth) {
        candidate.setMonth(targetMonth);
      } else {
        candidate.setFullYear(candidate.getFullYear() + 1);
        candidate.setMonth(targetMonth);
      }
    }
  }

  return candidate;
}

// ────────────────────────────────────────────
// GET — List report schedules
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
    const schedules = await db.reportSchedule.findMany({
      include: {
        template: { select: { name: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = await Promise.all(
      schedules.map(async (s) => {
        const reportCount = await db.generatedReport.count({
          where: { scheduleId: s.id },
        });

        return {
          id: s.id,
          name: s.name,
          templateId: s.templateId,
          template: {
            name: s.template.name,
            type: s.template.type,
          },
          cronExpr: s.cronExpr,
          timezone: s.timezone,
          format: s.format,
          recipients: s.recipients,
          isEnabled: s.isEnabled,
          lastRunAt: s.lastRunAt?.toISOString() ?? null,
          nextRunAt: s.nextRunAt?.toISOString() ?? null,
          runCount: s.runCount,
          reportCount,
          generatedBy: s.generatedBy,
          createdAt: s.createdAt.toISOString(),
        };
      }),
    );

    return NextResponse.json({ schedules: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ────────────────────────────────────────────
// POST — Create schedule
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
    const parsed = createScheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { name, templateId, cronExpr, timezone, format, recipients } = parsed.data;

    // Check template exists (DB or built-in)
    // For built-in templates, we need to auto-create a DB record as a reference
    let resolvedTemplateId = templateId;
    const dbTemplate = await db.reportTemplate.findUnique({ where: { id: templateId } });
    if (!dbTemplate) {
      // Check if it's a built-in template — if so, create a hidden DB record
      const { BUILT_IN_TEMPLATES } = await import('@/lib/report-templates');
      const builtIn = BUILT_IN_TEMPLATES.find((t) => t.id === templateId);
      if (!builtIn) {
        return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 });
      }

      // Create a DB-backed copy of the built-in template
      const created = await db.reportTemplate.create({
        data: {
          name: builtIn.name,
          description: builtIn.description,
          type: builtIn.type,
          technology: builtIn.technology ?? null,
          config: JSON.stringify({ sections: builtIn.sections }),
          isBuiltIn: true,
        },
      });
      resolvedTemplateId = created.id;
    }

    const nextRunAt = computeNextRun(cronExpr);

    const user = await checkApiAuth(request);

    const schedule = await db.reportSchedule.create({
      data: {
        name,
        templateId: resolvedTemplateId,
        cronExpr,
        timezone: timezone ?? 'Africa/Algiers',
        format: format ?? 'pdf',
        recipients: recipients ?? '[]',
        isEnabled: true,
        nextRunAt,
        generatedBy: user.id as string,
      },
    });

    return NextResponse.json(
      {
        id: schedule.id,
        name: schedule.name,
        templateId: schedule.templateId,
        cronExpr: schedule.cronExpr,
        timezone: schedule.timezone,
        format: schedule.format,
        recipients: schedule.recipients,
        isEnabled: schedule.isEnabled,
        nextRunAt: schedule.nextRunAt?.toISOString() ?? null,
        runCount: schedule.runCount,
        createdAt: schedule.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ────────────────────────────────────────────
// PATCH — Toggle schedule enable/disable
// ────────────────────────────────────────────
export async function PATCH(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const user = await checkApiAuth(request);
    const perms = (user.permissions as string[]) ?? [];
    const canEdit = perms.includes('*:*') || perms.includes('reports:*') || perms.includes('reports:edit');
    if (!canEdit) return forbiddenError();
  } catch (e: any) {
    if (e.message === 'UNAUTHENTICATED') return authError();
    if (e.message === 'FORBIDDEN') return forbiddenError();
    return authError();
  }

  try {
    const body = await request.json();
    const parsed = patchScheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { scheduleId, isEnabled } = parsed.data;

    const existing = await db.reportSchedule.findUnique({ where: { id: scheduleId } });
    if (!existing) {
      return NextResponse.json({ error: 'Programme non trouvé' }, { status: 404 });
    }

    const newEnabled = isEnabled ?? !existing.isEnabled;

    const updated = await db.reportSchedule.update({
      where: { id: scheduleId },
      data: {
        isEnabled: newEnabled,
        // When disabling: clear nextRunAt; when enabling: recalculate
        nextRunAt: newEnabled ? computeNextRun(existing.cronExpr) : null,
      },
    });

    return NextResponse.json({
      success: true,
      schedule: {
        id: updated.id,
        name: updated.name,
        isEnabled: updated.isEnabled,
        nextRunAt: updated.nextRunAt?.toISOString() ?? null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ────────────────────────────────────────────
// DELETE — Delete schedule
// ────────────────────────────────────────────
export async function DELETE(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);

  let currentUser!: Record<string, unknown>;
  try {
    currentUser = await checkApiAuth(request);
    const perms = (currentUser.permissions as string[]) ?? [];
    const canDelete = perms.includes('*:*') || perms.includes('reports:*') || perms.includes('reports:delete');
    if (!canDelete) return forbiddenError();
  } catch (e: any) {
    if (e.message === 'UNAUTHENTICATED') return authError();
    if (e.message === 'FORBIDDEN') return forbiddenError();
    return authError();
  }

  try {
    const body = await request.json();
    const parsed = deleteScheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { scheduleId } = parsed.data;

    const existing = await db.reportSchedule.findUnique({ where: { id: scheduleId } });
    if (!existing) {
      return NextResponse.json({ error: 'Programme non trouvé' }, { status: 404 });
    }

    // IDOR ownership check
    if (currentUser.id !== 'default-admin' && existing.generatedBy !== currentUser.id) {
      return forbiddenError();
    }

    // Generated reports linked to this schedule will have scheduleId set to null (onDelete: SetNull)
    await db.reportSchedule.delete({ where: { id: scheduleId } });

    return NextResponse.json({ success: true, deleted: scheduleId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
