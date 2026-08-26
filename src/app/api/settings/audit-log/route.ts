import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkApiAuth, authError, forbiddenError } from '@/lib/api-auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

// ─── Helper: check reports:view permission ─────────────────────────────────
async function requireReportsView(request: Request) {
  try {
    const user = await checkApiAuth(request);
    const perms = (user.permissions as string[]) ?? [];
    if (
      perms.includes('*:*') ||
      perms.includes('reports:*') ||
      perms.includes('reports:view')
    ) {
      return user;
    }
    return null;
  } catch {
    return 'UNAUTH';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET — Query audit logs with optional entityType filter and pagination
// ═══════════════════════════════════════════════════════════════════════════════
export async function GET(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  const authResult = await requireReportsView(request);
  if (authResult === 'UNAUTH') return authError();
  if (!authResult) return forbiddenError();

  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit')) || 50));
    const offset = Math.max(0, Number(searchParams.get('offset')) || 0);

    const where: Record<string, unknown> = {};
    if (entityType && typeof entityType === 'string') {
      where.entityType = entityType;
    }

    const [entries, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        select: {
          id: true,
          entityType: true,
          entityId: true,
          action: true,
          oldValue: true,
          newValue: true,
          description: true,
          technology: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      db.auditLog.count({ where }),
    ]);

    const mapped = entries.map((e) => ({
      id: e.id,
      entityType: e.entityType,
      entityId: e.entityId,
      action: e.action,
      oldValue: e.oldValue,
      newValue: e.newValue,
      description: e.description,
      technology: e.technology,
      createdAt: e.createdAt.toISOString(),
    }));

    return NextResponse.json({ entries: mapped, total });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message, entries: [], total: 0 }, { status: 500 });
  }
}
