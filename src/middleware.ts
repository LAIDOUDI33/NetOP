/**
 * Security Headers Middleware
 * 
 * AUTH: Currently disabled (AUTH_ENFORCED=false in api-auth.ts).
 * To re-activate: uncomment the auth block below.
 * SECURITY HEADERS: Always active — HSTS, CSP, CORS, X-headers.
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

// Allowed origins for CORS
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:3000', 'https://netop.djezzy.dz'];

function securityHeaders(response: NextResponse, request: NextRequest) {
  // HSTS — enforce HTTPS (1 year, include subdomains, preload ready)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  // XSS protection (legacy browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block');
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Permissions policy — restrict browser features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );

  // Content Security Policy — tightened for production
  const cspNonce = crypto.randomUUID().slice(0, 16);
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        `script-src 'self' 'nonce-${cspNonce}'`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        "connect-src 'self' ws: wss: https://sentry.io",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
      ].join('; ')
    );
  } else {
    // Dev CSP — more permissive
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self' ws: wss: http://localhost:3003 http://localhost:3004 http://localhost:3005 http://localhost:3006",
        "frame-ancestors 'none'",
      ].join('; ')
    );
  }

  // CORS — only for API routes
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
      response.headers.set('Access-Control-Max-Age', '86400');
      response.headers.set('Vary', 'Origin');
    }
  }

  // Cache control for API responses
  if (pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
  }

  return response;
}

export function middleware(request: NextRequest) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    return securityHeaders(response, request);
  }

  // Uncomment the next line to enable auth:
  // return securityHeaders(authMiddleware(request), request);
  return securityHeaders(NextResponse.next(), request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
