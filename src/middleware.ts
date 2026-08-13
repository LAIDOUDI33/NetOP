/**
 * NextAuth middleware + Security Headers
 * 
 * AUTH: Currently disabled (AUTH_ENFORCED=false in api-auth.ts).
 * To re-activate: uncomment the auth block below.
 * SECURITY HEADERS: Always active.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/* ——— RE-ACTIVATABLE AUTH BLOCK START ———
const publicPaths = ['/login', '/api/auth'];
const staticExtensions = ['/_next/static', '/_next/image', '/favicon.ico', '/icon.svg'];

function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (publicPaths.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (staticExtensions.some((ext) => pathname.startsWith(ext))) return NextResponse.next();
  const sessionToken =
    request.cookies.get('next-auth.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value;
  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}
——— RE-ACTIVATABLE AUTH BLOCK END ——— */

function securityHeaders(response: NextResponse) {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  // XSS protection (legacy browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block');
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy — restrict browser features
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'none';"
  );
  return response;
}

export function middleware(request: NextRequest) {
  // Uncomment the next line to enable auth:
  // return securityHeaders(authMiddleware(request));
  return securityHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
