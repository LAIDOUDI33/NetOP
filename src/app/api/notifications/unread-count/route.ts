import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError } from '@/lib/api-auth';

// ── GET /api/notifications/unread-count ─────────────────────────────────────

export async function GET(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 120 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const email = request.headers.get('x-user-email');
    if (!email) return authError();
    const user = await db.user.findUnique({ where: { email } });
    if (!user) return authError();

    const count = await db.notification.count({
      where: { userId: user.id, isRead: false },
    });

    const severityRows = await db.notification.groupBy({
      by: ['severity'],
      where: { userId: user.id, isRead: false },
      _count: true,
    });

    const bySeverity: Record<string, number> = {
      critical: 0,
      major: 0,
      minor: 0,
      warning: 0,
      info: 0,
    };
    for (const row of severityRows) {
      bySeverity[row.severity] = row._count;
    }

    return NextResponse.json({ count, bySeverity });
  } catch (error) {
    console.error('[Unread Count GET]', error);
    return NextResponse.json({ error: 'Failed to fetch unread count' }, { status: 500 });
  }
}
