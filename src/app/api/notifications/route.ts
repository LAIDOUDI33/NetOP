import { NextResponse } from 'next/server';
import { checkApiAuth, authError } from '@/lib/api-auth';
import { getNotifications, getUnreadCount, markAllRead, notify, notifyBroadcast, deleteNotification, cleanupOldNotifications } from '@/lib/notify';

export async function GET(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get('unread') === 'true';
  const type = searchParams.get('type') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50');
  const countOnly = searchParams.get('count') === 'true';

  if (countOnly) {
    const count = await getUnreadCount();
    return NextResponse.json({ count });
  }

  const notifications = await getNotifications(undefined, { unreadOnly, limit, type });
  return NextResponse.json({ notifications });
}

export async function POST(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const body = await request.json();
  const { title, message, type, category, severity, source, link, linkLabel, metadata, broadcast } = body;

  if (!title || !message) {
    return NextResponse.json({ error: 'title and message required' }, { status: 400 });
  }

  if (broadcast) {
    await notifyBroadcast({ title, message, type, category, severity, source, link, linkLabel, metadata });
  } else {
    await notify({ title, message, type, category, severity, source, link, linkLabel, metadata });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const cleanup = searchParams.get('cleanup') === 'true';
  const days = parseInt(searchParams.get('days') || '90');

  if (cleanup) {
    const result = await cleanupOldNotifications(days);
    return NextResponse.json({ deleted: result.count });
  }

  if (!id) {
    return NextResponse.json({ error: 'id or cleanup parameter required' }, { status: 400 });
  }

  await deleteNotification(id);
  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const body = await request.json();
  const { action, id } = body;

  if (action === 'mark_read' && id) {
    const { markNotificationRead } = await import('@/lib/notify');
    await markNotificationRead(id);
    return NextResponse.json({ success: true });
  }

  if (action === 'mark_all_read') {
    const result = await markAllRead();
    return NextResponse.json({ success: true, updated: result.count });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
