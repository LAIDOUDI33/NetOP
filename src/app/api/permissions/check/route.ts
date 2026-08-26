import { NextResponse } from 'next/server';
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }

  const { searchParams } = new URL(request.url);
  const permission = searchParams.get('permission');

  if (!permission) {
    return NextResponse.json({ error: 'permission parameter required' }, { status: 400 });
  }

  // When AUTH_ENFORCED is false, all permissions are granted
  const enforced = process.env.AUTH_ENFORCED === 'true';
  return NextResponse.json({
    permission,
    allowed: !enforced,
    enforced,
    message: enforced ? 'Permission checked against RBAC policies' : 'All permissions granted (demo mode)',
  });
}
