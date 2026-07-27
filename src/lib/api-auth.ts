// AUTH MODULE DEACTIVATED — Returns a dummy admin user instead of checking session.
// To reactivate: restore original getServerSession check below.

import { NextResponse } from 'next/server';

const DUMMY_USER: Record<string, unknown> = {
  id: 'demo-admin',
  email: 'admin@netoptima-dz.local',
  name: 'Demo Admin',
  roles: ['superadmin'],
  permissions: ['*:*'],
};

export async function checkApiAuth(_request: Request): Promise<Record<string, unknown>> {
  // Auth disabled — return dummy admin with full permissions
  return DUMMY_USER;
}

export function authError(): NextResponse {
  return NextResponse.json(
    { error: 'Non autorisé', code: 'AUTH_REQUIRED' },
    { status: 401 }
  );
}

// Re-enable when restoring auth:
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth';
// export async function checkApiAuth(request: Request): Promise<Record<string, unknown>> {
//   const session = await getServerSession(authOptions);
//   if (!session?.user) throw new Error('UNAUTHENTICATED');
//   return session.user as Record<string, unknown>;
// }
