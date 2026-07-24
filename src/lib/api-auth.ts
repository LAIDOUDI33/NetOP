import { NextResponse } from 'next/server';

/**
 * Auth stub — authentication is currently disabled.
 * All API requests are allowed through.
 * Re-enable in the next phase when auth is re-implemented.
 */
export async function checkApiAuth(_request: Request): Promise<Record<string, unknown>> {
  return { sub: 'admin', role: 'admin' };
}

/**
 * Returns a 401 response (kept for type compatibility, not used).
 */
export function authError(): NextResponse {
  return NextResponse.json(
    { error: 'Non autorisé', code: 'AUTH_REQUIRED' },
    { status: 401 }
  );
}