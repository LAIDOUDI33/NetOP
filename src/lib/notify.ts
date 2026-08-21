import { db } from '@/lib/db';

type NotifyOptions = {
  userId?: string;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success' | 'alert' | 'incident' | 'change' | 'system';
  category?: string;
  severity?: string;
  source?: string;
  link?: string;
  linkLabel?: string;
  metadata?: Record<string, unknown>;
};

export async function notify(opts: NotifyOptions) {
  await db.notification.create({
    data: {
      userId: opts.userId ?? null,
      title: opts.title,
      message: opts.message,
      type: opts.type ?? 'info',
      category: opts.category ?? 'system',
      severity: opts.severity ?? 'info',
      source: opts.source ?? 'system',
      link: opts.link ?? null,
      linkLabel: opts.linkLabel ?? null,
      metadata: JSON.stringify(opts.metadata ?? {}),
    },
  });
}

export async function notifyBroadcast(opts: Omit<NotifyOptions, 'userId'>) {
  await notify({ ...opts, userId: undefined }); // null userId = broadcast
}

export async function markNotificationRead(id: string, _userId?: string) {
  return db.notification.update({
    where: { id },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function markAllRead(userId?: string) {
  const where: Record<string, unknown> = { isRead: false };
  if (userId) where.userId = userId;
  return db.notification.updateMany({
    where,
    data: { isRead: true, readAt: new Date() },
  });
}

export async function getNotifications(userId?: string, opts?: { unreadOnly?: boolean; limit?: number; type?: string }) {
  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  if (opts?.unreadOnly) where.isRead = false;
  if (opts?.type) where.type = opts.type;
  return db.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: opts?.limit ?? 50,
  });
}

export async function getUnreadCount(userId?: string) {
  const where: Record<string, unknown> = { isRead: false };
  if (userId) where.userId = userId;
  return db.notification.count({ where });
}

export async function deleteNotification(id: string) {
  return db.notification.delete({ where: { id } });
}

export async function cleanupOldNotifications(daysOld: number = 90) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysOld);
  return db.notification.deleteMany({
    where: { createdAt: { lt: cutoff }, isRead: true },
  });
}
