import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/server's NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => {
      return new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { 'Content-Type': 'application/json', ...init?.headers },
      });
    },
  },
}));

import {
  AppError,
  NotFoundError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  RateLimitError,
  ServiceUnavailableError,
  ExternalServiceError,
  handleApiError,
  withErrorHandling,
  requestId,
} from '@/lib/errors';

describe('AppError', () => {
  it('sets default values', () => {
    const err = new AppError('test');
    expect(err.message).toBe('test');
    expect(err.name).toBe('AppError');
    expect(err.code).toBe('APPERROR');
    expect(err.statusCode).toBe(500);
    expect(err.isOperational).toBe(true);
    expect(err.timestamp).toBeDefined();
  });

  it('accepts custom options', () => {
    const err = new AppError('custom', {
      code: 'CUSTOM_CODE',
      statusCode: 418,
      isOperational: false,
    });
    expect(err.code).toBe('CUSTOM_CODE');
    expect(err.statusCode).toBe(418);
    expect(err.isOperational).toBe(false);
  });

  it('is instanceof Error', () => {
    const err = new AppError('test');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });
});

describe('NotFoundError', () => {
  it('sets 404 status', () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Resource not found');
  });

  it('accepts custom message and code', () => {
    const err = new NotFoundError('User not found', 'USER_NOT_FOUND');
    expect(err.message).toBe('User not found');
    expect(err.code).toBe('USER_NOT_FOUND');
  });
});

describe('ValidationError', () => {
  it('sets 400 status', () => {
    const err = new ValidationError();
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.details).toEqual([]);
  });

  it('accepts details', () => {
    const details = [{ field: 'email', message: 'Invalid email' }];
    const err = new ValidationError('Bad input', details);
    expect(err.details).toEqual(details);
  });
});

describe('AuthenticationError', () => {
  it('sets 401 status', () => {
    const err = new AuthenticationError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('AUTHENTICATION_ERROR');
  });
});

describe('ForbiddenError', () => {
  it('sets 403 status', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });
});

describe('RateLimitError', () => {
  it('sets 429 status', () => {
    const err = new RateLimitError('Slow down', 60);
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(err.retryAfter).toBe(60);
  });
});

describe('ServiceUnavailableError', () => {
  it('sets 503 status', () => {
    const err = new ServiceUnavailableError();
    expect(err.statusCode).toBe(503);
    expect(err.code).toBe('SERVICE_UNAVAILABLE');
  });
});

describe('ExternalServiceError', () => {
  it('sets 502 status', () => {
    const err = new ExternalServiceError('OSS down', 'OSS');
    expect(err.statusCode).toBe(502);
    expect(err.code).toBe('EXTERNAL_SERVICE_ERROR');
    expect(err.service).toBe('OSS');
  });
});

describe('requestId', () => {
  it('generates a UUID', () => {
    const id = requestId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('generates unique IDs', () => {
    const id1 = requestId();
    const id2 = requestId();
    expect(id1).not.toBe(id2);
  });
});

describe('handleApiError', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('NODE_ENV', 'test');
  });

  it('handles AppError subclasses', async () => {
    const err = new NotFoundError('Not here');
    const res = handleApiError(err);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error.code).toBe('NOT_FOUND');
    expect(data.error.message).toBe('Not here');
    expect(data.error.requestId).toBeDefined();
  });

  it('includes validation details', async () => {
    const details = [{ field: 'name', message: 'Required' }];
    const err = new ValidationError('Bad', details);
    const res = handleApiError(err);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.details).toEqual(details);
  });

  it('includes retryAfter for RateLimitError', async () => {
    const err = new RateLimitError('Too fast', 30);
    const res = handleApiError(err);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.error.retryAfter).toBe(30);
  });

  it('includes service for ExternalServiceError', async () => {
    const err = new ExternalServiceError('Down', 'CRM');
    const res = handleApiError(err);
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.error.service).toBe('CRM');
  });

  it('handles ZodError-like objects with issues', async () => {
    const zodLike = {
      issues: [
        { path: ['body', 'email'], message: 'Invalid email format' },
      ],
    };
    const res = handleApiError(zodLike);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(data.error.details).toEqual([
      { field: 'body.email', message: 'Invalid email format' },
    ]);
  });

  it('handles ZodError-like objects with errors', async () => {
    const zodLike = {
      errors: [
        { path: ['name'], message: 'Too short' },
      ],
    };
    const res = handleApiError(zodLike);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.details).toEqual([
      { field: 'name', message: 'Too short' },
    ]);
  });

  it('handles standard Error', async () => {
    const err = new Error('Something broke');
    const res = handleApiError(err);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error.code).toBe('INTERNAL_ERROR');
    // In non-production, leaks the message
    expect(data.error.message).toBe('Something broke');
  });

  it('sanitizes Error message in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const err = new Error('Internal details');
    const res = handleApiError(err);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error.message).toBe('An internal error occurred');
  });

  it('handles unknown values', async () => {
    const res = handleApiError('just a string');
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error.code).toBe('UNKNOWN_ERROR');
    expect(data.error.message).toBe('An unknown error occurred');
  });

  it('handles null', async () => {
    const res = handleApiError(null);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error.code).toBe('UNKNOWN_ERROR');
  });
});

describe('withErrorHandling', () => {
  it('passes through successful response', async () => {
    const handler = withErrorHandling(async () => {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const res = await handler({} as Request);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it('catches errors and returns error response', async () => {
    const handler = withErrorHandling(async () => {
      throw new NotFoundError('Gone');
    });

    const res = await handler({} as Request);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('passes params to handler', async () => {
    const handler = withErrorHandling(async (_req: Request, ctx?: any) => {
      const params = await ctx?.params;
      return new Response(JSON.stringify({ id: params?.id }), {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const res = await handler({} as Request, {
      params: Promise.resolve({ id: '123' }),
    });
    const data = await res.json();
    expect(data.id).toBe('123');
  });
});
