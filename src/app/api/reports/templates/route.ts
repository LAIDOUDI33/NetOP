import { z } from 'zod';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { checkApiAuth, authError, forbiddenError } from '@/lib/api-auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { BUILT_IN_TEMPLATES } from '@/lib/report-templates';

const VALID_TYPES = ['kpi', 'son', 'policy', 'sla', 'qoe', 'coverage', 'executive', 'custom'] as const;

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
  type: z.enum(VALID_TYPES, { message: `Type invalide. Valeurs: ${VALID_TYPES.join(', ')}` }),
  technology: z.string().optional(),
  config: z.string().optional(),
});

const deleteTemplateSchema = z.object({
  templateId: z.string().min(1),
});

// ────────────────────────────────────────────
// GET — List all report templates
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
    // Built-in templates first
    const builtIn = BUILT_IN_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      type: t.type,
      technology: t.technology ?? null,
      isBuiltIn: true,
      config: JSON.stringify({ sections: t.sections }),
      createdAt: new Date().toISOString(), // built-in templates have no DB timestamp
    }));

    // Custom DB templates
    const dbTemplates = await db.reportTemplate.findMany({
      where: { isBuiltIn: false },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    const custom = dbTemplates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      type: t.type,
      technology: t.technology,
      isBuiltIn: t.isBuiltIn,
      config: t.config,
      createdAt: t.createdAt.toISOString(),
    }));

    return NextResponse.json({ templates: [...builtIn, ...custom] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ────────────────────────────────────────────
// POST — Create custom report template
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
    const parsed = createTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { name, description, type, technology, config } = parsed.data;

    const template = await db.reportTemplate.create({
      data: {
        name,
        description: description ?? '',
        type,
        technology: technology ?? null,
        config: config ?? '{}',
        isBuiltIn: false,
        createdBy: (await checkApiAuth(request)).id as string,
      },
    });

    return NextResponse.json(
      {
        id: template.id,
        name: template.name,
        description: template.description,
        type: template.type,
        technology: template.technology,
        isBuiltIn: template.isBuiltIn,
        config: template.config,
        createdAt: template.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ────────────────────────────────────────────
// DELETE — Delete custom template
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
    const parsed = deleteTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { templateId } = parsed.data;

    const template = await db.reportTemplate.findUnique({ where: { id: templateId } });
    if (!template) {
      return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 });
    }

    if (template.isBuiltIn) {
      return NextResponse.json(
        { error: 'Impossible de supprimer un modèle intégré', code: 'BUILT_IN' },
        { status: 403 },
      );
    }

    // IDOR ownership check
    if (currentUser.id !== 'default-admin' && template.createdBy !== currentUser.id) {
      return forbiddenError();
    }

    // Cascade deletes schedules and generated reports (handled by Prisma schema onDelete: Cascade)
    await db.reportTemplate.delete({ where: { id: templateId } });

    return NextResponse.json({ success: true, deleted: templateId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
