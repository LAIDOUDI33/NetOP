import { NextResponse } from 'next/server';
import { seedRbac } from '@/lib/rbac';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, checkPermission, authError, forbiddenError } from '@/lib/api-auth';

export async function POST(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    // When auth is enforced, require admin permission to seed
    await checkPermission('users', 'admin');
  } catch (e: any) {
    if (e.message === 'UNAUTHENTICATED') return authError();
    if (e.message === 'FORBIDDEN') return forbiddenError();
    return authError();
  }

  try {
    await seedRbac();
    return NextResponse.json({ success: true, message: 'RBAC seeded successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
