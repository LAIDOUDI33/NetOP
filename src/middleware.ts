/**
 * NextAuth middleware — AUTH DISABLED (pass-through).
 * 
 * TO RE-ACTIVATE AUTH: uncomment the commented block below and delete the 3 lines above.
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

export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
