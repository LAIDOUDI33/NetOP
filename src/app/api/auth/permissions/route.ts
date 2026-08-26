import { NextResponse } from 'next/server';
import { checkApiAuth } from '@/lib/api-auth';
import { MODULE_VIEW_MAP } from '@/lib/rbac-constants';

export async function GET() {
  const user = await checkApiAuth();
  if (!user) {
    return NextResponse.json({ views: [], roles: [], permissions: [] });
  }

  const perms = user.permissions;
  const allowedViews = new Set<string>();

  if (perms.includes('*:*')) {
    Object.values(MODULE_VIEW_MAP).flat().forEach((v) => allowedViews.add(v));
  } else {
    for (const [mod, views] of Object.entries(MODULE_VIEW_MAP)) {
      if (perms.includes(`${mod}:*`) || perms.includes(`${mod}:view`)) {
        views.forEach((v) => allowedViews.add(v));
      }
    }
  }

  return NextResponse.json({
    views: Array.from(allowedViews),
    roles: user.roles,
    name: user.name,
    email: user.email,
  });
}
