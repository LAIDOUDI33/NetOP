import { z } from 'zod';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { checkApiAuth, authError, forbiddenError } from '@/lib/api-auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

function randomSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const createWebhookSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  url: z.string().url('URL invalide'),
  events: z.array(z.string()).optional(),
  description: z.string().optional(),
  secret: z.string().optional(),
});

const updateWebhookSchema = z.object({
  id: z.string().min(1, 'L\'identifiant est requis'),
  name: z.string().optional(),
  url: z.string().url('URL invalide').optional(),
  events: z.array(z.string()).optional(),
  isEnabled: z.boolean().optional(),
  description: z.string().optional(),
  secret: z.string().optional(),
});

const deleteWebhookSchema = z.object({
  id: z.string().min(1, 'L\'identifiant est requis'),
});

// ────────────────────────────────────────────
// GET — List webhooks with delivery stats
// ────────────────────────────────────────────
export async function GET(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const user = await checkApiAuth(request);
    const perms = (user.permissions as string[]) ?? [];
    const canView = perms.includes('*:*') || perms.includes('webhooks:*') || perms.includes('webhooks:view');
    if (!canView) return forbiddenError();
  } catch (e: any) {
    if (e.message === 'UNAUTHENTICATED') return authError();
    if (e.message === 'FORBIDDEN') return forbiddenError();
    return authError();
  }

  try {
    const { searchParams } = new URL(request.url);
    const isEnabledFilter = searchParams.get('isEnabled');

    const where: Record<string, unknown> = {};
    if (isEnabledFilter !== null) {
      where.isEnabled = isEnabledFilter === 'true';
    }

    const webhooks = await db.webhook.findMany({
      where,
      include: {
        _count: { select: { deliveries: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = webhooks.length;

    const result = webhooks.map((w) => {
      let parsedEvents: string[] = [];
      try {
        parsedEvents = JSON.parse(w.events as string);
      } catch {
        parsedEvents = [];
      }

      const totalDeliveries = (w._count?.deliveries ?? 0);
      const successRate = w.successCount + w.failureCount > 0
        ? Math.round((w.successCount / (w.successCount + w.failureCount)) * 100)
        : 100;

      return {
        id: w.id,
        name: w.name,
        url: w.url,
        events: parsedEvents,
        isEnabled: w.isEnabled,
        description: w.description,
        lastDeliveryAt: w.lastDeliveryAt?.toISOString() ?? null,
        successCount: w.successCount,
        failureCount: w.failureCount,
        deliveryCount: totalDeliveries,
        successRate,
        createdBy: w.createdBy,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({ webhooks: result, total });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ error: message, webhooks: [], total: 0 }, { status: 500 });
  }
}

// ────────────────────────────────────────────
// POST — Create webhook
// ────────────────────────────────────────────
export async function POST(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const user = await checkApiAuth(request);
    const perms = (user.permissions as string[]) ?? [];
    const canCreate = perms.includes('*:*') || perms.includes('webhooks:*') || perms.includes('webhooks:create');
    if (!canCreate) return forbiddenError();
  } catch (e: any) {
    if (e.message === 'UNAUTHENTICATED') return authError();
    if (e.message === 'FORBIDDEN') return forbiddenError();
    return authError();
  }

  try {
    const body = await request.json();
    const parsed = createWebhookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { name, url, events, description, secret } = parsed.data;
    const eventsJson = JSON.stringify(events ?? []);
    const webhookSecret = secret || randomSecret();

    const webhook = await db.webhook.create({
      data: {
        name,
        url,
        events: eventsJson,
        secret: webhookSecret,
        description: description ?? undefined,
        isEnabled: true,
        successCount: 0,
        failureCount: 0,
        createdBy: 'system',
      },
    });

    let parsedEvents: string[] = [];
    try {
      parsedEvents = JSON.parse(eventsJson);
    } catch {
      parsedEvents = [];
    }

    return NextResponse.json({
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      events: parsedEvents,
      isEnabled: webhook.isEnabled,
      description: webhook.description,
      createdBy: webhook.createdBy,
      createdAt: webhook.createdAt.toISOString(),
      updatedAt: webhook.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la création du webhook';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ────────────────────────────────────────────
// PATCH — Update webhook
// ────────────────────────────────────────────
export async function PATCH(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const user = await checkApiAuth(request);
    const perms = (user.permissions as string[]) ?? [];
    const canEdit = perms.includes('*:*') || perms.includes('webhooks:*') || perms.includes('webhooks:edit');
    if (!canEdit) return forbiddenError();
  } catch (e: any) {
    if (e.message === 'UNAUTHENTICATED') return authError();
    if (e.message === 'FORBIDDEN') return forbiddenError();
    return authError();
  }

  try {
    const body = await request.json();
    const parsed = updateWebhookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { id, name, url, events, isEnabled, description, secret } = parsed.data;

    const existing = await db.webhook.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Webhook introuvable' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (url !== undefined) data.url = url;
    if (events !== undefined) data.events = JSON.stringify(events);
    if (isEnabled !== undefined) data.isEnabled = isEnabled;
    if (description !== undefined) data.description = description;
    if (secret !== undefined) data.secret = secret;

    const updated = await db.webhook.update({
      where: { id },
      data,
    });

    let parsedEvents: string[] = [];
    try {
      parsedEvents = JSON.parse(updated.events as string);
    } catch {
      parsedEvents = [];
    }

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      url: updated.url,
      events: parsedEvents,
      isEnabled: updated.isEnabled,
      description: updated.description,
      lastDeliveryAt: updated.lastDeliveryAt?.toISOString() ?? null,
      successCount: updated.successCount,
      failureCount: updated.failureCount,
      createdBy: updated.createdBy,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la mise à jour du webhook';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ────────────────────────────────────────────
// DELETE — Delete webhook
// ────────────────────────────────────────────
export async function DELETE(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const user = await checkApiAuth(request);
    const perms = (user.permissions as string[]) ?? [];
    const canDelete = perms.includes('*:*') || perms.includes('webhooks:*') || perms.includes('webhooks:delete');
    if (!canDelete) return forbiddenError();
  } catch (e: any) {
    if (e.message === 'UNAUTHENTICATED') return authError();
    if (e.message === 'FORBIDDEN') return forbiddenError();
    return authError();
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'L\'identifiant est requis' }, { status: 400 });
    }

    const existing = await db.webhook.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Webhook introuvable' }, { status: 404 });
    }

    await db.webhookDelivery.deleteMany({ where: { webhookId: id } });
    await db.webhook.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la suppression du webhook';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
