import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Checks JWT authentication on a Next.js route handler request.
 * Must be called as the first thing inside each handler.
 * Returns the token if valid, or null if unauthenticated.
 */
export async function checkApiAuth(request: Request): Promise<Record<string, unknown> | null> {
  // Next.js passes Request; getToken accepts NextRequest or compatible objects
  const token = await getToken({
    req: request as any,
    secret: process.env.NEXTAUTH_SECRET,
  });
  return token;
}

/**
 * Returns a 401 response.
 */
export function authError(): NextResponse {
  return NextResponse.json(
    { error: 'Non autorisé', code: 'AUTH_REQUIRED' },
    { status: 401 }
  );
}
