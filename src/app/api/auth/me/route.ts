import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function GET(request: Request) {
  // Rate limit
  const { limited, resetMs } = await rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const user = session.user as Record<string, unknown>;
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles ?? [],
      permissions: user.permissions ?? [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
