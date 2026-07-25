/**
 * National SOC Platform - Database Client
 * 
 * Enhanced Prisma client configuration for the SOC platform:
 * - Singleton pattern for optimal performance
 * - Query logging in development
 * - Connection health checks
 * - Transaction helpers
 */

import { PrismaClient } from '@prisma/client';

// Global singleton pattern to prevent multiple instances
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Main Prisma client instance
 * Configured with:
 * - Query logging in development mode
 * - Error logging
 * - Connection pooling (for supported databases)
 */
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? [
          { emit: 'stdout', level: 'query' },
          { emit: 'stdout', level: 'error' },
          { emit: 'stdout', level: 'warn' },
        ]
      : [{ emit: 'stdout', level: 'error' }]
  });

// Store in global for development hot-reloading
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Check database connectivity
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latency: number;
  error?: string;
}> {
  const start = Date.now();
  
  try {
    await db.$queryRaw`SELECT 1`;
    return {
      healthy: true,
      latency: Date.now() - start
    };
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}

/**
 * Execute a transaction with automatic retry
 */
export async function withTransaction<T>(
  fn: (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await db.$transaction(fn);
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain errors
      if (error instanceof Error && (
        error.message.includes('Unique constraint') ||
        error.message.includes('Foreign key') ||
        error.message.includes('Not found')
      )) {
        throw error;
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
    }
  }

  throw lastError;
}

/**
 * Paginated query helper
 */
export async function paginatedQuery<T>(
  model: any,
  options: {
    where?: any;
    orderBy?: any;
    take?: number;
    skip?: number;
    include?: any;
  },
  additionalWhere?: any
) {
  const { take = 50, skip = 0, ...rest } = options;
  
  const where = additionalWhere 
    ? { AND: [options.where, additionalWhere] }
    : options.where;

  const [data, total] = await Promise.all([
    model.findMany({ ...rest, where, take, skip }),
    model.count({ where })
  ]);

  return {
    data,
    pagination: {
      total,
      take,
      skip,
      hasMore: skip + take < total,
      totalPages: Math.ceil(total / take)
    }
  };
}

// Export types for use in API routes
export type { PrismaClient };

// Default export
export default db;
