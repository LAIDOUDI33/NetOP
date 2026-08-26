import { z } from 'zod';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';

const singleActionSchema = z.object({
  action: z.enum(['mark-read', 'acknowledge', 'dismiss']),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ── WebSocket Push Helper ───────────────────────────────────────────────────

const REALTIME_SERVICE_URL = process.env.REALTIME_SERVICE_URL || 'http://localhost:3003';

async function triggerUnreadCountPush(userId: string) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    await fetch(`${REALTIME_SERVICE_URL}/push-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds: [userId], notificationIds: [] }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
  } catch {
    // Non-blocking
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getUser(request: NextRequest) {
  const email = request.headers.get('x-user-email');
  if (!email) return null;
  return db.user.findUnique({
    where: { email },
    include: { preferences: true },
  });
}

// ── PATCH /api/notifications/[id] ───────────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 120 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const { id } = await params;
    const user = await getUser(request);
    if (!user) return authError();

    const body = await request.json();
    const parsed = singleActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Verify notification belongs to user
    const existing = await db.notification.findUnique({
      where: { id },
    });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const { action } = parsed.data;

    // Dismiss = delete
    if (action === 'dismiss') {
      await db.notification.delete({ where: { id } });
      logAudit({ entityType: 'notification', entityId: id, action: 'delete', category: 'system', requestedBy: user.name || 'system' });
      // Push updated count
      triggerUnreadCountPush(user.id);
      return NextResponse.json({ success: true });
    }

    const updated = await db.notification.update({
      where: { id },
      data:
        action === 'mark-read'
          ? { isRead: true }
          : { acknowledged: true, acknowledgedAt: new Date() },
    });

    logAudit({ entityType: 'notification', entityId: id, action: action === 'mark-read' ? 'update' : 'acknowledge', field: action === 'mark-read' ? 'isRead' : 'acknowledged', category: 'system', requestedBy: user.name || 'system' });

    // Push updated unread count via WebSocket
    triggerUnreadCountPush(user.id);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[Notification PATCH]', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}

// ── DELETE /api/notifications/[id] ──────────────────────────────────────────

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 120 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const { id } = await params;
    const user = await getUser(request);
    if (!user) return authError();

    // Verify ownership before delete
    const existing = await db.notification.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    await db.notification.delete({ where: { id } });

    // Push updated unread count via WebSocket
    triggerUnreadCountPush(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Notification DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
}
