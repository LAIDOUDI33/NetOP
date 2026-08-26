/**
 * Centralized error handling for the NetOP NOC platform.
 *
 * Provides structured error classes, a unified API error serializer,
 * and a higher-order function for Next.js route handlers.
 */

import { NextResponse } from 'next/server';

 
/** Route handler signature matching Next.js 16 App Router conventions. */
export type RouteHandler = (
  _request: Request,
  _ctx?: { params: Promise<Record<string, string>> },
) => Promise<Response> | Response;
 

// ─── Base AppError ──────────────────────────────────────────────────────────

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: string;

  constructor(
    message: string,
    options: {
      code?: string;
      statusCode?: number;
      isOperational?: boolean;
    } = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code ?? this.constructor.name.toUpperCase();
    this.statusCode = options.statusCode ?? 500;
    this.isOperational = options.isOperational ?? true;
    this.timestamp = new Date().toISOString();

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── Specific Error Classes ──────────────────────────────────────────────────

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(message, { code, statusCode: 404 });
  }
}

export class ValidationError extends AppError {
  public readonly details: Array<{ field: string; message: string }>;

  constructor(
    message = 'Validation failed',
    details: Array<{ field: string; message: string }> = [],
    code = 'VALIDATION_ERROR',
  ) {
    super(message, { code, statusCode: 400 });
    this.details = details;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', code = 'AUTHENTICATION_ERROR') {
    super(message, { code, statusCode: 401 });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied', code = 'FORBIDDEN') {
    super(message, { code, statusCode: 403 });
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(
    message = 'Too many requests',
    retryAfter: number,
    code = 'RATE_LIMIT_EXCEEDED',
  ) {
    super(message, { code, statusCode: 429 });
    this.retryAfter = retryAfter;
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service unavailable', code = 'SERVICE_UNAVAILABLE') {
    super(message, { code, statusCode: 503 });
  }
}

export class ExternalServiceError extends AppError {
  public readonly service: string;

  constructor(
    message = 'External service error',
    service: string,
    code = 'EXTERNAL_SERVICE_ERROR',
  ) {
    super(message, { code, statusCode: 502 });
    this.service = service;
  }
}

// ─── Request ID ─────────────────────────────────────────────────────────────

/** Generate a unique request ID for tracing. */
export function requestId(): string {
  return crypto.randomUUID();
}

// ─── handleApiError ─────────────────────────────────────────────────────────

interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
    retryAfter?: number;
    service?: string;
    requestId: string;
  };
}

/**
 * Takes any thrown value and returns a consistent NextResponse JSON error.
 *
 * - AppError sub-classes → structured response with code, message, details
 * - ZodError-like objects (with `issues` or `errors` array) → mapped to ValidationError shape
 * - Generic Error → 500 INTERNAL_ERROR with the message (sanitized in production)
 * - Unknown values → 500 UNKNOWN_ERROR
 */
export function handleApiError(error: unknown): NextResponse<ApiErrorBody> {
  const rid = requestId();

  // --- Known AppError ---
  if (error instanceof AppError) {
    const body: ApiErrorBody = {
      error: {
        code: error.code,
        message: error.message,
        requestId: rid,
      },
    };

    if (error instanceof ValidationError && error.details.length > 0) {
      body.error.details = error.details;
    }
    if (error instanceof RateLimitError) {
      body.error.retryAfter = error.retryAfter;
    }
    if (error instanceof ExternalServiceError) {
      body.error.service = error.service;
    }

    return NextResponse.json(body, { status: error.statusCode });
  }

  // --- ZodError-like objects (duck-typing) ---
  if (
    typeof error === 'object' &&
    error !== null &&
    ('issues' in error || 'errors' in error)
  ) {
    const issues: Array<{ path: (string | number)[]; message: string }> =
      (error as { issues?: unknown[]; errors?: unknown[] }).issues ??
      (error as { errors?: unknown[] }).errors ??
      [];

    const details = issues.map((issue) => {
      const i = issue as { path?: (string | number)[]; message: string };
      return {
        field: (i.path ?? []).join('.'),
        message: i.message,
      };
    });

    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details,
          requestId: rid,
        },
      },
      { status: 400 },
    );
  }

  // --- Standard Error ---
  if (error instanceof Error) {
    // In production, don't leak internal error messages
    const message =
      process.env.NODE_ENV === 'production'
        ? 'An internal error occurred'
        : error.message;

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message,
          requestId: rid,
        },
      },
      { status: 500 },
    );
  }

  // --- Unknown ---
  return NextResponse.json(
    {
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred',
        requestId: rid,
      },
    },
    { status: 500 },
  );
}

// ─── withErrorHandling ───────────────────────────────────────────────────────

/**
 * Higher-order function for Next.js route handlers.
 *
 * Wraps the handler in try/catch and returns a proper error response
 * via `handleApiError` on failure.
 *
 * Usage:
 *   export const GET = withErrorHandling(async (req) => {
 *     // ... your logic
 *   });
 */
export function withErrorHandling(
  handler: RouteHandler,
): RouteHandler {
  return async (request: Request, ctx?: { params: Promise<Record<string, string>> }) => {
    try {
      return await handler(request, ctx);
    } catch (err) {
      return handleApiError(err);
    }
  };
}
