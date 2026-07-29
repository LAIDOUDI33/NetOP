import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Check the current user's session and return the user object.
 * Throws if unauthenticated.
 */
export async function checkApiAuth(request: Request): Promise<Record<string, unknown>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error('UNAUTHENTICATED');
  }
  return session.user as Record<string, unknown>;
}

/**
 * Check if the current user has a specific permission.
 * Throws if unauthenticated or unauthorized.
 */
export async function checkPermission(module: string, action: string): Promise<Record<string, unknown>> {
  const user = await checkApiAuth({} as Request);
  const perms = (user.permissions as string[]) ?? [];

  if (perms.includes('*:*')) return user;
  if (perms.includes(`${module}:*`)) return user;
  if (perms.includes(`${module}:${action}`)) return user;

  throw new Error('FORBIDDEN');
}

/**
 * Check if the current user has any of the given permissions.
 * Throws if unauthenticated or has none of the permissions.
 */
export async function checkAnyPermission(permissions: string[]): Promise<Record<string, unknown>> {
  const user = await checkApiAuth({} as Request);
  const perms = (user.permissions as string[]) ?? [];

  if (perms.includes('*:*')) return user;

  const hasAny = permissions.some((p) => {
    const [mod, act] = p.split(':');
    if (perms.includes(`${mod}:*`)) return true;
    return perms.includes(p);
  });

  if (hasAny) return user;
  throw new Error('FORBIDDEN');
}

/** Return a 401 Unauthorized JSON response */
export function authError(): NextResponse {
  return NextResponse.json(
    { error: 'Non autorisé', code: 'AUTH_REQUIRED' },
    { status: 401 },
  );
}

/** Return a 403 Forbidden JSON response */
export function forbiddenError(): NextResponse {
  return NextResponse.json(
    { error: 'Accès refusé', code: 'FORBIDDEN' },
    { status: 403 },
  );
}
