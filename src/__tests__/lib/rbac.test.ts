import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next-auth');
vi.mock('@/lib/auth');
vi.mock('@/lib/db');

import { hasPermission, hasAnyPermission, getAllowedViews } from '@/lib/rbac';
import { getServerSession } from 'next-auth';
import { ROLES, ALL_MODULES, ALL_ACTIONS, MODULE_VIEW_MAP, ROLE_DEFAULTS } from '@/lib/rbac-constants';

const mockedGetServerSession = vi.mocked(getServerSession);

function mockSession(permissions: string[]) {
  mockedGetServerSession.mockResolvedValue({
    user: {
      id: 'user-1',
      name: 'Test',
      email: 'test@test.com',
      permissions,
    },
  } as any);
}

function mockNoSession() {
  mockedGetServerSession.mockResolvedValue(null as any);
}

describe('hasPermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when no session', async () => {
    mockNoSession();
    expect(await hasPermission('dashboard', 'view')).toBe(false);
  });

  it('returns true for *:* wildcard', async () => {
    mockSession(['*:*']);
    expect(await hasPermission('any_module', 'any_action')).toBe(true);
  });

  it('returns true for module:* wildcard', async () => {
    mockSession(['dashboard:*']);
    expect(await hasPermission('dashboard', 'view')).toBe(true);
    expect(await hasPermission('dashboard', 'create')).toBe(true);
    expect(await hasPermission('dashboard', 'delete')).toBe(true);
  });

  it('returns true for exact module:action match', async () => {
    mockSession(['dashboard:view']);
    expect(await hasPermission('dashboard', 'view')).toBe(true);
    expect(await hasPermission('dashboard', 'edit')).toBe(false);
  });

  it('returns false when no matching permission', async () => {
    mockSession(['dashboard:view']);
    expect(await hasPermission('alerts', 'create')).toBe(false);
  });
});

describe('hasAnyPermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when no session', async () => {
    mockNoSession();
    expect(await hasAnyPermission(['dashboard:view'])).toBe(false);
  });

  it('returns true when user has *:*', async () => {
    mockSession(['*:*']);
    expect(await hasAnyPermission(['dashboard:view'])).toBe(true);
  });

  it('returns true when user has one of the required permissions', async () => {
    mockSession(['dashboard:view']);
    expect(await hasAnyPermission(['dashboard:view', 'alerts:create'])).toBe(true);
  });

  it('returns true when user has module:* matching a requested perm', async () => {
    mockSession(['dashboard:*']);
    expect(await hasAnyPermission(['dashboard:edit'])).toBe(true);
  });

  it('returns false when user has none of the required permissions', async () => {
    mockSession(['dashboard:view']);
    expect(await hasAnyPermission(['alerts:create', 'alerts:delete'])).toBe(false);
  });
});

describe('getAllowedViews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all views for *:* permission', async () => {
    mockSession(['*:*']);
    const views = await getAllowedViews();
    // Should include all views from MODULE_VIEW_MAP
    const allViews = Object.values(MODULE_VIEW_MAP).flat();
    expect(views).toEqual(expect.arrayContaining(allViews));
  });

  it('returns specific views for module:view', async () => {
    mockSession(['dashboard:view']);
    const views = await getAllowedViews();
    expect(views).toContain('dashboard');
    expect(views).not.toContain('monitoring');
  });

  it('returns module views for module:*', async () => {
    mockSession(['monitoring:*']);
    const views = await getAllowedViews();
    expect(views).toContain('monitoring');
    expect(views).toContain('live');
    expect(views).toContain('health');
  });

  it('returns empty array when no session', async () => {
    mockNoSession();
    const views = await getAllowedViews();
    expect(views).toEqual([]);
  });
});

describe('RBAC Constants', () => {
  it('exports correct role names', () => {
    expect(Object.keys(ROLES)).toEqual([
      'superadmin', 'noc_manager', 'rf_engineer', 'nop_engineer', 'field_tech', 'view_only',
    ]);
  });

  it('ALL_MODULES matches MODULE_VIEW_MAP keys', () => {
    expect(ALL_MODULES).toEqual(Object.keys(MODULE_VIEW_MAP));
  });

  it('ALL_ACTIONS is non-empty', () => {
    expect(ALL_ACTIONS.length).toBeGreaterThan(0);
    expect(ALL_ACTIONS).toContain('view');
    expect(ALL_ACTIONS).toContain('create');
    expect(ALL_ACTIONS).toContain('edit');
    expect(ALL_ACTIONS).toContain('delete');
  });

  it('ROLE_DEFAULTS has entry for each role', () => {
    for (const roleName of Object.keys(ROLES)) {
      expect(ROLE_DEFAULTS[roleName]).toBeDefined();
      expect(ROLE_DEFAULTS[roleName].length).toBeGreaterThan(0);
    }
  });

  it('superadmin has *:* permission', () => {
    expect(ROLE_DEFAULTS.superadmin).toContain('*:*');
  });
});
