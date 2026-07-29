/**
 * NextAuth middleware — AUTH CURRENTLY DISABLED.
 * 
 * To re-enable authentication:
 *   1. Uncomment the body of the middleware function below.
 *   2. Uncomment the matcher config.
 *   3. Ensure NEXTAUTH_SECRET is set in .env.production.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Auth disabled — allow all requests through.
// To re-enable: replace this body with the commented block below.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

// ─── RE-ACTIVATE AUTH: uncomment everything below and delete the 3 lines above ───
//
// const publicPaths = ['/login', '/api/auth'];
// const staticExtensions = ['/_next/static', '/_next/image', '/favicon.ico', '/icon.svg'];
//
// export function middleware(request: NextRequest) {
//   const { pathname } = request.nextUrl;
//
//   // Allow public paths
//   if (publicPaths.some((p) => pathname.startsWith(p))) return NextResponse.next();
//
//   // Allow static assets
//   if (staticExtensions.some((ext) => pathname.startsWith(ext))) return NextResponse.next();
//
//   // Check for session token in cookies
//   const sessionToken =
//     request.cookies.get('next-auth.session-token')?.value ||
//     request.cookies.get('__Secure-next-auth.session-token')?.value;
//
//   if (!sessionToken) {
//     const loginUrl = new URL('/login', request.url);
//     loginUrl.searchParams.set('callbackUrl', pathname);
//     return NextResponse.redirect(loginUrl);
//   }
//
//   return NextResponse.next();
// }

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
