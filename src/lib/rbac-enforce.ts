import { checkApiAuth, authError } from './api-auth';
import { db } from './db';

/**
 * Check whether the current request has a specific permission.
 *
 * Returns `{ allowed: true }` when auth is not enforced (demo mode),
 * or when the authenticated user's roles grant the requested permission.
 *
 * Usage:
 * ```ts
 * const { allowed, error } = await requirePermission(request, 'alerts:view');
 * if (!allowed) return error!;
 * ```
 */
export async function requirePermission(
  request: Request,
  permission: string,
): Promise<{ allowed: boolean; userId?: string; error?: Response }> {
  // Step 1: Check authentication
  let user: Record<string, unknown>;
  try {
    user = await checkApiAuth(request);
  } catch {
    return { allowed: false, error: authError() };
  }

  // Step 2: If auth is not enforced, grant all permissions (demo mode)
  if (process.env.AUTH_ENFORCED !== 'true') {
    return { allowed: true, userId: user.id as string | undefined };
  }

  // Step 3: Check the permission against user's roles
  const perms = (user.permissions as string[]) ?? [];

  // Wildcard access
  if (perms.includes('*:*')) {
    return { allowed: true, userId: user.id as string | undefined };
  }

  // Parse the requested permission into module:action
  const [mod, act] = permission.split(':');
  if (!mod || !act) {
    return { allowed: false, error: new Response(JSON.stringify({ error: 'Invalid permission format. Use module:action.' }), { status: 400, headers: { 'Content-Type': 'application/json' } }) };
  }

  // Module wildcard
  if (perms.includes(`${mod}:*`)) {
    return { allowed: true, userId: user.id as string | undefined };
  }

  // Exact match
  if (perms.includes(permission)) {
    return { allowed: true, userId: user.id as string | undefined };
  }

  // Check DB-backed roles when auth is enforced and user has an id
  const userId = user.id as string | undefined;
  if (userId && userId !== 'default-admin') {
    const userRoles = await db.userRole.findMany({
      where: { userId },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });

    for (const ur of userRoles) {
      for (const rp of ur.role.permissions) {
        const p = rp.permission;
        if (p.module === mod && (p.action === '*' || p.action === act)) {
          return { allowed: true, userId };
        }
      }
    }
  }

  return {
    allowed: false,
    userId,
    error: new Response(
      JSON.stringify({ error: 'Acces refuse', code: 'FORBIDDEN', permission }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    ),
  };
}

/**
 * Convenience wrapper that throws if permission is not granted.
 * Use in routes that prefer try/catch error handling:
 * ```ts
 * try { await enforcePermission(request, 'changes:approve'); } catch { return forbiddenError(); }
 * ```
 */
export async function enforcePermission(request: Request, permission: string): Promise<void> {
  const result = await requirePermission(request, permission);
  if (!result.allowed) {
    throw new Error(`Permission denied: ${permission}`);
  }
}
