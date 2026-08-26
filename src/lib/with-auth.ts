import { NextRequest, NextResponse } from 'next/server';
import { checkApiAuth, authError } from '@/lib/api-auth';

export type AuthenticatedRequest = NextRequest & { user: Record<string, unknown> };

interface WithAuthOptions {
  permission?: string;
  public?: boolean;
}

type RouteHandler = (
  _request: AuthenticatedRequest,
  _context?: { params: Promise<Record<string, string | string[]>> }
) => Promise<NextResponse | Response>;

export function withAuth(handler: RouteHandler, options: WithAuthOptions = {}) {
  return async (request: NextRequest, context) => {
    if (options.public) {
      return handler(request as AuthenticatedRequest, context);
    }
    try {
      const user = await checkApiAuth(request);
      if (!user) return authError();
      (request as AuthenticatedRequest).user = user;
      return handler(request as AuthenticatedRequest, context);
    } catch (error: unknown) {
      if (error.message === 'UNAUTHENTICATED') return authError();
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  };
}
