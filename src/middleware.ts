// AUTH MODULE DEACTIVATED — Re-enable by restoring the original middleware logic below.
// Original: redirect unauthenticated users to /login
// To reactivate: uncomment the body of the middleware function and the matcher config.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(_request: NextRequest) {
  // Auth disabled — pass through all requests
  return NextResponse.next();
}

// Re-enable this when restoring auth:
// const publicPaths = ['/login', '/api/auth'];
// export function middleware(request: NextRequest) {
//   const { pathname } = request.nextUrl;
//   if (publicPaths.some((p) => pathname.startsWith(p))) return NextResponse.next();
//   if (pathname.startsWith('/_next') || pathname.startsWith('/icon') || pathname === '/favicon.ico') return NextResponse.next();
//   const sessionToken = request.cookies.get('next-auth.session-token')?.value || request.cookies.get('__Secure-next-auth.session-token')?.value;
//   if (!sessionToken) {
//     const loginUrl = new URL('/login', request.url);
//     loginUrl.searchParams.set('callbackUrl', pathname);
//     return NextResponse.redirect(loginUrl);
//   }
//   return NextResponse.next();
// }
// export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'], };
