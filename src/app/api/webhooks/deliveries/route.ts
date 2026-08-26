import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { checkApiAuth, authError, forbiddenError } from '@/lib/api-auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

// ────────────────────────────────────────────
// GET — List webhook deliveries
// ────────────────────────────────────────────
export async function GET(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const user = await checkApiAuth(request);
    const perms = (user.permissions as string[]) ?? [];
    const canView = perms.includes('*:*') || perms.includes('webhooks:*') || perms.includes('webhooks:view');
    if (!canView) return forbiddenError();
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHENTICATED') return authError();
    if (e instanceof Error && e.message === 'FORBIDDEN') return forbiddenError();
    return authError();
  }

  try {
    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('webhookId');
    const event = searchParams.get('event');
    const successParam = searchParams.get('success');
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 1), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0);

    const where: Record<string, unknown> = {};
    if (webhookId) where.webhookId = webhookId;
    if (event) where.event = event;
    if (successParam !== null) {
      where.success = successParam === 'true';
    }

    const [deliveries, total] = await Promise.all([
      db.webhookDelivery.findMany({
        where,
        include: {
          webhook: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.webhookDelivery.count({ where }),
    ]);

    const result = deliveries.map((d) => {
      let parsedPayload: Record<string, unknown> = {};
      try {
        parsedPayload = JSON.parse(d.payload as string);
      } catch {
        parsedPayload = {};
      }

      return {
        id: d.id,
        webhookId: d.webhookId,
        webhookName: d.webhook?.name ?? '',
        event: d.event,
        payload: parsedPayload,
        statusCode: d.statusCode,
        responseBody: d.responseBody,
        durationMs: d.durationMs,
        success: d.success,
        errorMessage: d.errorMessage,
        attemptCount: d.attemptCount,
        createdAt: d.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ deliveries: result, total });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ error: message, deliveries: [], total: 0 }, { status: 500 });
  }
}
