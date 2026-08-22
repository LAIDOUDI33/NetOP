import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL TEST MOCKS — vitest.setup.ts
// ═══════════════════════════════════════════════════════════════════════════════
// These mocks apply to ALL tests. Individual test files can override with
// their own vi.mock() + factory if they need different behaviour.
// DO NOT add vi.mock() without a factory for these modules in test files —
// auto-mocking returns undefined and breaks destructuring.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Helper: create a mock Prisma model ────────────────────────────────────────
function mockModel() {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockResolvedValue(null),
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    count: vi.fn().mockResolvedValue(0),
    groupBy: vi.fn().mockResolvedValue([]),
    aggregate: vi.fn().mockResolvedValue({ _max: { timestamp: new Date() }, _avg: {} }),
    upsert: vi.fn().mockResolvedValue({}),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    distinct: vi.fn().mockResolvedValue([]),
  };
}

// ─── Database (Prisma) ────────────────────────────────────────────────────────
vi.mock('@/lib/db', () => ({
  db: {
    $queryRaw: vi.fn().mockResolvedValue([{ '1': 1 }]),
    $executeRaw: vi.fn().mockResolvedValue(undefined),
    $transaction: vi.fn().mockImplementation(async (fn: unknown) => {
      if (typeof fn === 'function') return fn({});
      return [];
    }),
    // ─── NOC Domain Models ────────────────────────────────────────────────
    networkSite: mockModel(),
    alert: mockModel(),
    alertRule: mockModel(),
    kpiMetric: mockModel(),
    anomalyEvent: mockModel(),
    incident: mockModel(),
    outageEvent: mockModel(),
    faultPrediction: mockModel(),
    healthScore: mockModel(),
    cellLoad: mockModel(),
    qoeMetric: mockModel(),
    energyMetric: mockModel(),
    sonModule: mockModel(),
    sonAction: mockModel(),
    policy: mockModel(),
    policyExecution: mockModel(),
    capacityForecast: mockModel(),
    churnPrediction: mockModel(),
    trafficForecast: mockModel(),
    revenueProjection: mockModel(),
    ossNetworkElement: mockModel(),
    ossFaultEvent: mockModel(),
    auditLog: mockModel(),
    auditTrail: mockModel(),
    dataPipeline: mockModel(),
    pipelineExecution: mockModel(),
    dataSource: mockModel(),
    dataQualityRule: mockModel(),
    externalIntegration: mockModel(),
    playbook: mockModel(),
    // ─── RBAC Models ──────────────────────────────────────────────────────
    user: mockModel(),
    role: mockModel(),
    permission: mockModel(),
    rolePermission: mockModel(),
    userRole: mockModel(),
    // ─── Other Models ─────────────────────────────────────────────────────
    apiToken: mockModel(),
    webhook: mockModel(),
    webhookDelivery: mockModel(),
    reportTemplate: mockModel(),
    reportSchedule: mockModel(),
    reportHistory: mockModel(),
    notificationRule: mockModel(),
    notificationHistory: mockModel(),
    simulation: mockModel(),
    digitalTwinScenario: mockModel(),
  },
}));

// ─── Rate Limiter ─────────────────────────────────────────────────────────────
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockReturnValue({ limited: false, remaining: 99, resetMs: 0 }),
  rateLimitResponse: (resetMs: number) =>
    new Response(
      JSON.stringify({ error: 'Trop de requêtes', code: 'RATE_LIMITED', retry_after_ms: resetMs }),
      { status: 429 },
    ),
}));

// ─── API Auth (passthrough — auth is disabled in tests) ──────────────────────
vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn().mockResolvedValue({
    id: 'test-admin',
    name: 'Test Admin',
    email: 'test@netop.dz',
    roles: ['admin'],
    permissions: ['*:*'],
  }),
  authError: () =>
    new Response(JSON.stringify({ error: 'Non autorisé', code: 'AUTH_REQUIRED' }), { status: 401 }),
  forbiddenError: () =>
    new Response(JSON.stringify({ error: 'Accès refusé', code: 'FORBIDDEN' }), { status: 403 }),
}));

// ─── Cache Helper (passthrough — always executes query) ──────────────────────
vi.mock('@/lib/cache-helper', () => {
  const makeCache = () => ({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    invalidate: vi.fn(),
    invalidatePattern: vi.fn(),
    clear: vi.fn(),
  });
  return {
    cachedQuery: vi.fn().mockImplementation(
      async (_cache: unknown, _key: string, _ttlMs: number, queryFn: () => Promise<unknown>) => queryFn(),
    ),
    dashboardCache: makeCache(),
    kpiCache: makeCache(),
    alertCache: makeCache(),
    analyticsCache: makeCache(),
    predictionCache: makeCache(),
  };
});

// ─── Demo Time (deterministic timestamps) ────────────────────────────────────
vi.mock('@/lib/demo-time', () => {
  const base = new Date('2025-01-15T12:00:00.000Z');
  return {
    getDemoNow: vi.fn().mockResolvedValue(base),
    demoHoursAgo: vi.fn().mockImplementation((h: number) =>
      Promise.resolve(new Date(base.getTime() - h * 3_600_000)),
    ),
    demoMinutesAgo: vi.fn().mockImplementation((m: number) => base.getTime() - m * 60_000),
    demoDaysAgo: vi.fn().mockImplementation((d: number) =>
      Promise.resolve(new Date(base.getTime() - d * 86_400_000)),
    ),
  };
});

// ─── AI SDK (mocked for all tests) ────────────────────────────────────────────
vi.mock('z-ai-web-dev-sdk', () => {
  const mockCreate = vi.fn().mockResolvedValue({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: '{}' } }],
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

// ─── ProductionCache ──────────────────────────────────────────────────────────
vi.mock('@/lib/cache', () => ({
  ProductionCache: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    invalidate: vi.fn(),
    invalidatePattern: vi.fn(),
    clear: vi.fn(),
    stats: vi.fn().mockReturnValue({ size: 0, hits: 0, misses: 0 }),
  })),
}));

// ─── next-auth ────────────────────────────────────────────────────────────────
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

// ─── bcryptjs ─────────────────────────────────────────────────────────────────
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$10$hashedpassword'),
    compare: vi.fn().mockResolvedValue(true),
  },
  hash: vi.fn().mockResolvedValue('$2b$10$hashedpassword'),
  compare: vi.fn().mockResolvedValue(true),
}));
