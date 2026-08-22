import { vi } from 'vitest';

// ─── Mock Prisma ─────────────────────────────────────────────────────────────
// This setup file provides a comprehensive mock for @/lib/db.
// Individual test files can override specific mock methods as needed.

const mockQueryRaw = vi.fn().mockResolvedValue([{ '1': 1 }]);

vi.mock('@/lib/db', () => ({
  db: {
    // Raw query
    $queryRaw: mockQueryRaw,
    $executeRaw: vi.fn().mockResolvedValue(undefined),

    // Network sites
    networkSite: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
      aggregate: vi.fn().mockResolvedValue({ _max: { timestamp: new Date() } }),
      upsert: vi.fn(),
    },

    // Alerts
    alert: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
    },

    // Alert rules
    alertRule: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },

    // KPI metrics
    kpiMetric: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
      aggregate: vi.fn().mockResolvedValue({ _max: { timestamp: new Date() }, _avg: {} as any }),
      distinct: vi.fn(),
    },

    // SON modules
    sonModule: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },

    // SON actions
    sonAction: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },

    // Anomaly events
    anomalyEvent: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },

    // Policies
    policy: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },

    // Policy executions
    policyExecution: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },

    // Incidents
    incident: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },

    // Outage events
    outageEvent: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },

    // Fault predictions
    faultPrediction: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },

    // External integrations
    externalIntegration: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },

    // OSS network elements
    ossNetworkElement: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },

    // OSS fault events
    ossFaultEvent: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },

    // Audit log
    auditLog: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },

    // Data pipelines
    dataPipeline: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },

    // Pipeline executions
    pipelineExecution: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },

    // Data sources
    dataSource: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },

    // Data quality rules
    dataQualityRule: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },

    // Capacity forecasts
    capacityForecast: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },

    // Churn predictions
    churnPrediction: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },

    // Traffic forecasts
    trafficForecast: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },

    // Revenue projections
    revenueProjection: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },

    // Users, roles, permissions (RBAC)
    user: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    role: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    permission: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    rolePermission: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    userRole: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
  },
}));

// ─── Mock AI SDK ─────────────────────────────────────────────────────────────
vi.mock('z-ai-web-dev-sdk', () => {
  const mockCreate = vi.fn().mockResolvedValue({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify({
            actionType: 'adjust_tilt',
            parameter: 'electricalTilt',
            previousValue: '6',
            newValue: '4',
            reason: 'Drop rate exceeds threshold.',
          }) } }],
        }),
      },
    },
  });
  return {
    __esModule: true,
    default: { create: mockCreate },
    ZAIWebDevSDK: { create: mockCreate },
    create: mockCreate,
  };
});

// ─── Mock next-auth ──────────────────────────────────────────────────────────
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

// ─── Mock api-auth (passthrough) ──────────────────────────────────────────────
// Individual test files that need to test auth failure should re-mock this.
vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn().mockResolvedValue({
    id: 'test-admin',
    name: 'Test Admin',
    email: 'test@netop.dz',
    roles: ['admin'],
    permissions: ['*:*'],
  }),
  authError: () => new Response(JSON.stringify({ error: 'Non autorise', code: 'AUTH_REQUIRED' }), { status: 401 }),
  forbiddenError: () => new Response(JSON.stringify({ error: 'Acces refuse', code: 'FORBIDDEN' }), { status: 403 }),
}));

// ─── Mock rate-limit ──────────────────────────────────────────────────────────
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockReturnValue({ limited: false, resetMs: 0 }),
  rateLimitResponse: (resetMs: number) => new Response(JSON.stringify({ error: 'Rate limit exceeded', retryAfter: resetMs }), { status: 429 }),
}));

// ─── Mock cache-helper ────────────────────────────────────────────────────────
vi.mock('@/lib/cache-helper', () => {
  // Create simple cache instances that just pass through
  const makeCache = () => ({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    invalidate: vi.fn(),
    invalidatePattern: vi.fn(),
    clear: vi.fn(),
  });
  return {
    cachedQuery: vi.fn().mockImplementation(
      async (_cache: any, _key: string, _ttlMs: number, queryFn: () => Promise<any>) => {
        return queryFn();
      }
    ),
    dashboardCache: makeCache(),
    kpiCache: makeCache(),
    alertCache: makeCache(),
    analyticsCache: makeCache(),
    predictionCache: makeCache(),
  };
});

// ─── Mock demo-time ──────────────────────────────────────────────────────────
vi.mock('@/lib/demo-time', () => {
  const base = new Date('2025-01-15T12:00:00.000Z');
  return {
    getDemoNow: vi.fn().mockResolvedValue(base),
    demoHoursAgo: vi.fn().mockImplementation((hours: number) => {
      return Promise.resolve(new Date(base.getTime() - hours * 60 * 60 * 1000));
    }),
    demoMinutesAgo: vi.fn().mockImplementation((minutes: number) => {
      return base.getTime() - minutes * 60 * 1000;
    }),
    demoDaysAgo: vi.fn().mockImplementation((days: number) => {
      return Promise.resolve(new Date(base.getTime() - days * 24 * 60 * 60 * 1000));
    }),
  };
});

// ─── Mock bcryptjs ───────────────────────────────────────────────────────────
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$10$hashedpassword'),
    compare: vi.fn().mockResolvedValue(true),
  },
  hash: vi.fn().mockResolvedValue('$2b$10$hashedpassword'),
  compare: vi.fn().mockResolvedValue(true),
}));

// ─── Mock ProductionCache (used by cache-helper) ─────────────────────────────
vi.mock('@/lib/cache', () => ({
  ProductionCache: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    invalidate: vi.fn(),
    invalidatePattern: vi.fn(),
    clear: vi.fn(),
  })),
}));

export { mockQueryRaw };
