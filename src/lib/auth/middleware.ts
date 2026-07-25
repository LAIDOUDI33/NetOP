/**
 * National SOC Platform - Authentication Middleware
 * 
 * Protects API routes with JWT authentication:
 * - Token verification
 * - User validation
 * - Role-based access control
 * - Session checking
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, extractTokenFromHeader, hasPermission, type JWTPayload } from '@/lib/auth/utils';

// ============================================================
// TYPES
// ============================================================

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

export interface AuthOptions {
  /** Required permissions (any one is sufficient) */
  permissions?: string[];
  
  /** Required roles (any one is sufficient) */
  roles?: string[];
  
  /** Allow unauthenticated access (optional auth) */
  optional?: boolean;
}

export interface AuthResult {
  authenticated: boolean;
  user?: JWTPayload;
  error?: string;
  statusCode?: number;
}

// ============================================================
// MAIN AUTHENTICATION FUNCTION
// ============================================================

/**
 * Authenticate a request and optionally check permissions/roles
 */
export async function authenticateRequest(
  request: NextRequest,
  options: AuthOptions = {}
): Promise<AuthResult> {
  const { permissions = [], roles = [], optional = false } = options;

  // Extract token from header
  const authHeader = request.headers.get('authorization');
  const token = extractTokenFromHeader(authHeader);

  // No token provided
  if (!token) {
    if (optional) {
      return { authenticated: true }; // No user, but allowed
    }
    
    return {
      authenticated: false,
      error: 'Authentication required. Please provide a valid token.',
      statusCode: 401
    };
  }

  // Verify token
  const verification = await verifyAccessToken(token);

  if (!verification.valid || !verification.payload) {
    return {
      authenticated: false,
      error: verification.error === 'Token expired' 
        ? 'Token has expired. Please refresh your token.'
        : 'Invalid or expired authentication token.',
      statusCode: 401
    };
  }

  const user = verification.payload;

  // Check roles if specified
  if (roles.length > 0 && !roles.includes(user.roleName)) {
    return {
      authenticated: false,
      error: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${user.roleName}`,
      statusCode: 403
    };
  }

  // Check permissions if specified
  if (permissions.length > 0) {
    const hasRequiredPermission = permissions.some(perm => 
      hasPermission(user.roleName, perm)
    );

    if (!hasRequiredPermission) {
      return {
        authenticated: false,
        error: `Insufficient permissions. Required: ${permissions.join(' or ')}`,
        statusCode: 403
      };
    }
  }

  return {
    authenticated: true,
    user
  };
}

/**
 * Create an authentication middleware function for API routes
 */
export function createAuthMiddleware(options: AuthOptions = {}) {
  return async (
    request: NextRequest
  ): Promise<{ response?: NextResponse; user?: JWTPayload }> => {
    const result = await authenticateRequest(request, options);

    if (!result.authenticated) {
      return {
        response: NextResponse.json(
          {
            success: false,
            error: result.error,
            errorCode: result.statusCode === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'
          },
          { status: result.statusCode || 401 }
        )
      };
    }

    return { user: result.user };
  };
}

// ============================================================
// PRE-BUILT MIDDLEWARE FOR COMMON SCENARIOS
// ============================================================

/**
 * Require any authenticated user
 */
export const requireAuth = createAuthMiddleware();

/**
 * Require admin role only
 */
export const requireAdmin = createAuthMiddleware({ roles: ['soc_admin'] });

/**
 * Require analyst or higher
 */
export const requireAnalyst = createAuthMiddleware({
  roles: ['soc_admin', 'analyst', 'threat_hunter']
});

/**
 * Require specific permission
 */
export function requirePermission(permission: string) {
  return createAuthMiddleware({ permissions: [permission] });
}

/**
 * Require any of the listed permissions
 */
export function requireAnyPermission(permissions: string[]) {
  return createAuthMiddleware({ permissions });
}

// ============================================================
// HELPER FUNCTIONS FOR ROUTE HANDLERS
// ============================================================

/**
 * Wrap a route handler with authentication
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const auth = await withAuth(request);
 *   if (auth.response) return auth.response;
 *   
 *   // User is authenticated, proceed
 *   const userId = auth.user!.userId;
 * }
 * ```
 */
export async function withAuth(
  request: NextRequest,
  options: AuthOptions = {}
): Promise<{ response?: NextResponse; user?: JWTPayload }> {
  return createAuthMiddleware(options)(request);
}

/**
 * Get current user from request (returns null if not authenticated)
 */
export async function getCurrentUser(request: NextRequest): Promise<JWTPayload | null> {
  const result = await authenticateRequest(request, { optional: true });
  return result.user || null;
}

/**
 * Check if user has specific permission (for conditional logic in handlers)
 */
export async function checkPermission(
  request: NextRequest,
  permission: string
): Promise<boolean> {
  const user = await getCurrentUser(request);
  if (!user) return false;
  
  return hasPermission(user.roleName, permission);
}

// ============================================================
// RESPONSE HELPERS
// ============================================================

/**
 * Standard unauthorized response
 */
export function unauthorized(message: string = 'Authentication required'): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      errorCode: 'UNAUTHORIZED'
    },
    { status: 401 }
  );
}

/**
 * Standard forbidden response
 */
export function forbidden(message: string = 'Access denied'): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      errorCode: 'FORBIDDEN'
    },
    { status: 403 }
  );
}

// Export all utilities
export {
  extractTokenFromHeader,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getRolePermissions
};

export default {
  authenticateRequest,
  createAuthMiddleware,
  withAuth,
  getCurrentUser,
  checkPermission,
  requireAuth,
  requireAdmin,
  requireAnalyst,
  requirePermission,
  requireAnyPermission,
  unauthorized,
  forbidden
};
