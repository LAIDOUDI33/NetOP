import { z } from 'zod';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { checkApiAuth, authError, forbiddenError } from '@/lib/api-auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

// ─── Constants ───────────────────────────────────────────
const RULE_TYPES = ['not_null', 'range', 'uniqueness', 'freshness', 'completeness', 'custom'] as const;
const SEVERITY_LEVELS = ['critical', 'warning', 'info'] as const;

// ─── Schemas ─────────────────────────────────────────────
const createRuleSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  targetModel: z.string().min(1, 'Le modèle cible est requis'),
  ruleType: z.enum(RULE_TYPES, {
    message: `Type de règle invalide. Valeurs: ${RULE_TYPES.join(', ')}`,
  }),
  ruleConfig: z.record(z.string(), z.unknown()).optional(),
  severity: z.enum(SEVERITY_LEVELS).optional().default('warning'),
  description: z.string().optional(),
});

const updateRuleSchema = z.object({
  id: z.string().min(1, 'L\'identifiant est requis'),
  name: z.string().optional(),
  description: z.string().optional(),
  ruleConfig: z.record(z.string(), z.unknown()).optional(),
  severity: z.enum(SEVERITY_LEVELS).optional(),
  isEnabled: z.boolean().optional(),
});

// ─── GET — List quality rules ────────────────────────────
export async function GET(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const user = await checkApiAuth(request);
    const perms = (user.permissions as string[]) ?? [];
    const canView = perms.includes('*:*') || perms.includes('etl:*') || perms.includes('etl:view');
    if (!canView) return forbiddenError();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'UNAUTHENTICATED') return authError();
    if (msg === 'FORBIDDEN') return forbiddenError();
    return authError();
  }

  try {
    const { searchParams } = new URL(request.url);
    const targetModel = searchParams.get('targetModel') ?? undefined;
    const ruleType = searchParams.get('ruleType') ?? undefined;
    const severity = searchParams.get('severity') ?? undefined;
    const isEnabledParam = searchParams.get('isEnabled');

    const where: Record<string, unknown> = {};
    if (targetModel) {
      where.targetModel = targetModel;
    }
    if (ruleType) {
      where.ruleType = ruleType;
    }
    if (severity) {
      where.severity = severity;
    }
    if (isEnabledParam !== null && isEnabledParam !== '') {
      where.isEnabled = isEnabledParam === 'true';
    }

    const [rules, total] = await Promise.all([
      db.dataQualityRule.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      }),
      db.dataQualityRule.count({ where }),
    ]);

    const result = rules.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      targetModel: r.targetModel,
      ruleType: r.ruleType,
      ruleConfig: JSON.parse(r.ruleConfig),
      severity: r.severity,
      isEnabled: r.isEnabled,
      lastEvaluatedAt: r.lastEvaluatedAt?.toISOString() ?? null,
      lastPassRate: r.lastPassRate,
      totalEvaluations: r.totalEvaluations,
      totalPasses: r.totalPasses,
      totalFailures: r.totalFailures,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return NextResponse.json({ rules: result, total });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST — Create quality rule ──────────────────────────
export async function POST(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const user = await checkApiAuth(request);
    const perms = (user.permissions as string[]) ?? [];
    const canCreate = perms.includes('*:*') || perms.includes('etl:*') || perms.includes('etl:create');
    if (!canCreate) return forbiddenError();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'UNAUTHENTICATED') return authError();
    if (msg === 'FORBIDDEN') return forbiddenError();
    return authError();
  }

  try {
    const body = await request.json();
    const parsed = createRuleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation échouée', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const rule = await db.dataQualityRule.create({
      data: {
        name: parsed.data.name,
        targetModel: parsed.data.targetModel,
        ruleType: parsed.data.ruleType,
        ruleConfig: JSON.stringify(parsed.data.ruleConfig ?? {}),
        severity: parsed.data.severity,
        description: parsed.data.description ?? '',
      },
    });

    return NextResponse.json(
      {
        id: rule.id,
        name: rule.name,
        description: rule.description,
        targetModel: rule.targetModel,
        ruleType: rule.ruleType,
        ruleConfig: JSON.parse(rule.ruleConfig),
        severity: rule.severity,
        isEnabled: rule.isEnabled,
        createdAt: rule.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── PATCH — Update quality rule ────────────────────────
export async function PATCH(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const user = await checkApiAuth(request);
    const perms = (user.permissions as string[]) ?? [];
    const canEdit = perms.includes('*:*') || perms.includes('etl:*') || perms.includes('etl:edit');
    if (!canEdit) return forbiddenError();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'UNAUTHENTICATED') return authError();
    if (msg === 'FORBIDDEN') return forbiddenError();
    return authError();
  }

  try {
    const body = await request.json();
    const parsed = updateRuleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation échouée', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { id, ruleConfig, ...rest } = parsed.data;
    const existing = await db.dataQualityRule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Règle de qualité non trouvée' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { ...rest };
    if (ruleConfig !== undefined) {
      updateData.ruleConfig = JSON.stringify(ruleConfig);
    }

    const rule = await db.dataQualityRule.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      severity: rule.severity,
      isEnabled: rule.isEnabled,
      updatedAt: rule.updatedAt.toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── DELETE — Delete quality rule ────────────────────────
export async function DELETE(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const user = await checkApiAuth(request);
    const perms = (user.permissions as string[]) ?? [];
    const canDelete = perms.includes('*:*') || perms.includes('etl:*') || perms.includes('etl:delete');
    if (!canDelete) return forbiddenError();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'UNAUTHENTICATED') return authError();
    if (msg === 'FORBIDDEN') return forbiddenError();
    return authError();
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'L\'identifiant id est requis' }, { status: 400 });
    }

    const existing = await db.dataQualityRule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Règle de qualité non trouvée' }, { status: 404 });
    }

    await db.dataQualityRule.delete({ where: { id } });
    return NextResponse.json({ success: true, deleted: id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
