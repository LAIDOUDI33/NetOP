import { describe, it, expect, vi, beforeEach } from 'vitest';


import { GET, PATCH } from '@/app/api/alerts/route';
import { db } from '@/lib/db';

const mockDb = db as any;

const now = new Date('2025-01-15T12:00:00.000Z');

function makeAlert(overrides: Record<string, any> = {}) {
  return {
    id: 'alert-1',
    severity: 'critical',
    technology: '4G',
    metric: 'rsrp',
    value: -120,
    threshold: -100,
    message: 'RSRP below threshold',
    acknowledged: false,
    resolvedAt: null,
    createdAt: now,
    site: { name: 'Site A', code: 'SITE-A' },
    ...overrides,
  };
}

function makeAlertRule(overrides: Record<string, any> = {}) {
  return {
    id: 'rule-1',
    name: 'Low RSRP',
    technology: '4G',
    metric: 'rsrp',
    condition: 'below',
    threshold: -100,
    severity: 'critical',
    enabled: true,
    createdAt: now,
    ...overrides,
  };
}

describe('GET /api/alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns alerts, rules, and stats', async () => {
    mockDb.alert.findMany
      .mockResolvedValueOnce([makeAlert()])
      .mockResolvedValueOnce([makeAlert()]);
    mockDb.alertRule.findMany.mockResolvedValue([makeAlertRule()]);

    const req = new Request('http://localhost/api/alerts');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.alerts).toHaveLength(1);
    expect(data.rules).toHaveLength(1);
    expect(data.stats).toBeDefined();
    expect(data.stats.total).toBe(1);
    expect(data.stats.critical).toBe(1);
    expect(data.stats.byTech).toBeDefined();
  });

  it('filters by severity', async () => {
    mockDb.alert.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockDb.alertRule.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/alerts?severity=critical');
    const res = await GET(req);

    expect(res.status).toBe(200);
    // Verify the second call (allUnresolved) had a where filter
    const calls = mockDb.alert.findMany.mock.calls;
    // First call has where with severity
    expect(calls[0][0].where.severity).toBe('critical');
  });

  it('filters by technology', async () => {
    mockDb.alert.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockDb.alertRule.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/alerts?technology=4G');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const calls = mockDb.alert.findMany.mock.calls;
    expect(calls[0][0].where.technology).toBe('4G');
  });

  it('shows resolved alerts when resolved=true', async () => {
    mockDb.alert.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockDb.alertRule.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/alerts?resolved=true');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const calls = mockDb.alert.findMany.mock.calls;
    // Should NOT have resolvedAt: null in where
    expect(calls[0][0].where.resolvedAt).toBeUndefined();
  });

  it('returns 500 on database error', async () => {
    const { cachedQuery } = await import('@/lib/cache-helper');
    vi.mocked(cachedQuery).mockRejectedValueOnce(new Error('DB down'));

    const req = new Request('http://localhost/api/alerts');
    const res = await GET(req);

    expect(res.status).toBe(500);
  });

  it('maps alert data correctly', async () => {
    const alert = makeAlert({
      id: 'a-2',
      severity: 'warning',
      technology: '3G',
      site: { name: 'Site B', code: 'SITE-B' },
      createdAt: new Date('2025-01-15T10:00:00.000Z'),
    });
    mockDb.alert.findMany
      .mockResolvedValueOnce([alert])
      .mockResolvedValueOnce([alert]);
    mockDb.alertRule.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/alerts');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    const mapped = data.alerts[0];
    expect(mapped.id).toBe('a-2');
    expect(mapped.siteName).toBe('Site B');
    expect(mapped.siteCode).toBe('SITE-B');
    expect(mapped.technology).toBe('3G');
    expect(mapped.severity).toBe('warning');
    expect(mapped.createdAt).toBeDefined();
  });
});

describe('PATCH /api/alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('acknowledges an alert', async () => {
    mockDb.alert.update.mockResolvedValue({ id: 'alert-1', acknowledged: true });

    const req = new Request('http://localhost/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'acknowledge', alertId: 'alert-1' }),
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDb.alert.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'alert-1' } }),
    );
  });

  it('resolves an alert', async () => {
    mockDb.alert.update.mockResolvedValue({ id: 'alert-1', resolvedAt: new Date() });

    const req = new Request('http://localhost/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resolve', alertId: 'alert-1' }),
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDb.alert.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'alert-1' },
        data: expect.objectContaining({ resolvedAt: expect.any(Date) }),
      }),
    );
  });

  it('toggles a rule', async () => {
    mockDb.alertRule.update.mockResolvedValue({ id: 'rule-1', enabled: false });

    const req = new Request('http://localhost/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggleRule', ruleId: 'rule-1', enabled: false }),
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 400 for invalid action', async () => {
    const req = new Request('http://localhost/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'acknowledge' }), // missing alertId
    });
    const res = await PATCH(req);

    // This should still go through (alertId is optional) but hit the "Invalid action" branch
    // since acknowledge without alertId won't match any branch
    expect(res.status).toBe(400);
  });

  it('returns 400 for validation failure', async () => {
    const req = new Request('http://localhost/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: 'data' }),
    });
    const res = await PATCH(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Validation failed');
    expect(data.details).toBeDefined();
  });
});
