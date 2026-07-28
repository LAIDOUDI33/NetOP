import { NextResponse } from 'next/server';
import { seedRbac } from '@/lib/rbac';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);
  try {
    await seedRbac();
    return NextResponse.json({ success: true, message: 'RBAC seeded successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}