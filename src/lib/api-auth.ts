import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function checkApiAuth(request: Request): Promise<Record<string, unknown>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error('UNAUTHENTICATED');
  }
  return session.user as Record<string, unknown>;
}

export function authError(): NextResponse {
  return NextResponse.json(
    { error: 'Non autorisé', code: 'AUTH_REQUIRED' },
    { status: 401 }
  );
}
