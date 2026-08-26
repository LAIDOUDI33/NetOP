import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/NetOptima/);
  });

  test('unauthenticated API returns 401', async ({ request }) => {
    const res = await request.get('/api/dashboard');
    expect(res.status()).toBe(401);
  });

  test('health check is public', async ({ request }) => {
    const res = await request.get('/api/health-check');
    expect(res.status()).toBe(200);
  });

  test('metrics endpoint is public and returns text', async ({ request }) => {
    const res = await request.get('/api/metrics');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('netoptima_process_uptime_seconds');
  });
});
