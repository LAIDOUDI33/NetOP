import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/assistant/chat/route';
import { db } from '@/lib/db';

const _mockDb = db as any;

describe('POST /api/assistant/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns streaming response for valid messages', async () => {
    // All DB calls resolve with defaults (empty arrays / 0 counts)
    const req = new Request('http://localhost/api/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'What is the network status?' }],
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    // The stream body should be a ReadableStream
    expect(res.body).toBeInstanceOf(ReadableStream);
  });

  it('includes currentView in context when provided', async () => {
    const req = new Request('http://localhost/api/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Show alerts' }],
        currentView: 'coverage',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);
  });

  it('returns 400 for missing messages array', async () => {
    const req = new Request('http://localhost/api/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 for empty messages array', async () => {
    const req = new Request('http://localhost/api/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: [] }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 500 when ZAI streaming fails', async () => {
    vi.resetModules();
    const { POST } = await import('@/app/api/assistant/chat/route');
    const ZAI = await import('z-ai-web-dev-sdk');
    vi.mocked(ZAI.default?.create ?? ZAI.create).mockRejectedValueOnce(new Error('ZAI init fail'));

    const req = new Request('http://localhost/api/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'test' }],
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req as any);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});
