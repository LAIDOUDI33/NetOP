/**
 * NextAuth middleware — AUTH ENABLED.
 * 
 * To disable: replace the body of middleware with `return NextResponse.next();`
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/login', '/api/auth'];
const staticExtensions = ['/_next/static', '/_next/image', '/favicon.ico', '/icon.svg'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) return NextResponse.next();

  // Allow static assets
  if (staticExtensions.some((ext) => pathname.startsWith(ext))) return NextResponse.next();

  // Check for session token in cookies
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

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
