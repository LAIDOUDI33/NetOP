import { test, expect } from '@playwright/test';

test.describe('Comprehensive Platform Tests', () => {
  
  test.describe('Authentication Enforcement', () => {
    const protectedRoutes = [
      '/api/dashboard', '/api/alerts', '/api/kpi', '/api/monitoring',
      '/api/health', '/api/coverage', '/api/capacity', '/api/incidents',
      '/api/executive', '/api/live', '/api/trends', '/api/load',
      '/api/handover', '/api/spectrum', '/api/energy', '/api/faults',
      '/api/outages', '/api/sla', '/api/roi', '/api/reports',
      '/api/optimizer', '/api/son', '/api/policies', '/api/qoe',
      '/api/anomalies', '/api/benchmark', '/api/correlation',
      '/api/coverage-holes', '/api/interference', '/api/vendors',
      '/api/vendor-compare', '/api/npi', '/api/onboarding',
      '/api/simulations', '/api/playbooks', '/api/services',
      '/api/slicing', '/api/subscribers', '/api/evolution',
      '/api/data-pipeline', '/api/changes', '/api/config',
      '/api/integration-hub', '/api/integrations/billing',
      '/api/integrations/crm', '/api/integrations/oss',
      '/api/multi-agent', '/api/settings/users', '/api/settings/roles',
      '/api/settings/audit', '/api/parameters', '/api/son/actions',
      '/api/son/neighbors', '/api/policies/executions',
      '/api/assistant', '/api/backup', '/api/restore',
      '/api/anomalies/detect', '/api/auth/seed', '/api/route',
    ];

    for (const route of protectedRoutes) {
      test(`${route} returns 401 without auth`, async ({ request }) => {
        const res = await request.get(route);
        expect([401, 405]).toContain(res.status());
      });
    }
  });

  test.describe('Public Endpoints', () => {
    test('health-check returns 200 with valid JSON', async ({ request }) => {
      const res = await request.get('/api/health-check');
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('healthy');
      expect(body.services).toBeDefined();
    });

    test('metrics returns 200 with Prometheus text', async ({ request }) => {
      const res = await request.get('/api/metrics');
      expect(res.status()).toBe(200);
      const text = await res.text();
      expect(text).toContain('netoptima_process_uptime_seconds');
      expect(text).toContain('netoptima_sites_total');
    });
  });

  test.describe('Security Headers', () => {
    test('all responses have security headers', async ({ request }) => {
      const res = await request.get('/api/health-check');
      const headers = res.headers();
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toBe('DENY');
      expect(headers['x-xss-protection']).toBe('1; mode=block');
      expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(headers['permissions-policy']).toContain('camera=()');
      expect(headers['x-request-id']).toBeDefined();
      expect(headers['x-request-id'].length).toBe(32);
    });
  });

  test.describe('Page Routing', () => {
    test('root / redirects to /login', async ({ page }) => {
      await page.goto('/');
      await page.waitForURL('**/login**');
      expect(page.url()).toContain('/login');
    });

    test('login page has NetOptima branding', async ({ page }) => {
      await page.goto('/login');
      const title = await page.title();
      expect(title).toContain('NetOptima');
    });
  });
});
