import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkApiAuth, authError } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  try {
    const session = await import('next-auth').then(m => m.getServerSession());
    if (!session?.user) return authError();
    const userId = (session.user as any).id;
    if (!userId) return authError();
    let prefs = await db.userPreferences.findUnique({ where: { userId } });
    if (!prefs) {
      prefs = await db.userPreferences.create({ data: { userId } });
    }
    return NextResponse.json(prefs);
  } catch (error: unknown) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  try {
    const session = await import('next-auth').then(m => m.getServerSession());
    if (!session?.user) return authError();
    const userId = (session.user as any).id;
    if (!userId) return authError();
    const body = await request.json();
    const { bio, timezone, phone, locale, theme, density, defaultView, dateFormat, timeFormat, sidebarCollapsed, notifyCritical, notifyMajor, notifyMinor, notifyWarning, notifyInfo, notifySound, notifyBrowser, quietHoursEnabled, quietHoursStart, quietHoursEnd, digestFrequency } = body;
    const data: Record<string, unknown> = {};
    if (bio !== undefined) data.bio = bio;
    if (timezone !== undefined) data.timezone = timezone;
    if (locale !== undefined) data.locale = locale;
    if (theme !== undefined) data.theme = theme;
    if (density !== undefined) data.density = density;
    if (defaultView !== undefined) data.defaultView = defaultView;
    if (dateFormat !== undefined) data.dateFormat = dateFormat;
    if (timeFormat !== undefined) data.timeFormat = timeFormat;
    if (sidebarCollapsed !== undefined) data.sidebarCollapsed = sidebarCollapsed;
    if (notifyCritical !== undefined) data.notifyCritical = notifyCritical;
    if (notifyMajor !== undefined) data.notifyMajor = notifyMajor;
    if (notifyMinor !== undefined) data.notifyMinor = notifyMinor;
    if (notifyWarning !== undefined) data.notifyWarning = notifyWarning;
    if (notifyInfo !== undefined) data.notifyInfo = notifyInfo;
    if (notifySound !== undefined) data.notifySound = notifySound;
    if (notifyBrowser !== undefined) data.notifyBrowser = notifyBrowser;
    if (quietHoursEnabled !== undefined) data.quietHoursEnabled = quietHoursEnabled;
    if (quietHoursStart !== undefined) data.quietHoursStart = quietHoursStart;
    if (quietHoursEnd !== undefined) data.quietHoursEnd = quietHoursEnd;
    if (digestFrequency !== undefined) data.digestFrequency = digestFrequency;
    const prefs = await db.userPreferences.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
    if (phone !== undefined) {
      await db.user.update({ where: { id: userId }, data: { phone } });
    }
    logAudit({ entityType: 'user_preferences', entityId: userId, action: 'update', category: 'config', requestedBy: userId });
    return NextResponse.json(prefs);
  } catch (error: unknown) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
