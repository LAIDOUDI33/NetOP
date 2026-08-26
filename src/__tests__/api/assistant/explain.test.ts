import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/assistant/explain/route';
import { db } from '@/lib/db';

const mockDb = db as any;

describe('POST /api/assistant/explain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns explanation for anomaly type', async () => {
    mockDb.anomalyEvent.findUnique.mockResolvedValueOnce({
      id: 'anom-1',
      metric: 'RSRP',
      value: -110,
      expectedRange: [-95, -70],
      site: { name: 'Site A', region: 'Algiers', technology: '4G' },
    });

    const req = new Request('http://localhost/api/assistant/explain', {
      method: 'POST',
      body: JSON.stringify({ type: 'anomaly', id: 'anom-1' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.explanation).toBeDefined();
    expect(data.type).toBe('anomaly');
    expect(data.id).toBe('anom-1');
  });

  it('returns 404 when record not found', async () => {
    mockDb.anomalyEvent.findUnique.mockResolvedValueOnce(null);
    mockDb.capacityForecast.findUnique.mockResolvedValueOnce(null);
    mockDb.faultPrediction.findUnique.mockResolvedValueOnce(null);
    mockDb.churnPrediction.findUnique.mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/assistant/explain', {
      method: 'POST',
      body: JSON.stringify({ type: 'anomaly', id: 'nonexistent' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req as any);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('Record not found');
  });

  it('returns 400 for invalid type', async () => {
    const req = new Request('http://localhost/api/assistant/explain', {
      method: 'POST',
      body: JSON.stringify({ type: 'invalid', id: 'abc' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing id', async () => {
    const req = new Request('http://localhost/api/assistant/explain', {
      method: 'POST',
      body: JSON.stringify({ type: 'anomaly' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 500 when AI generation fails', async () => {
    vi.resetModules();
    const { POST } = await import('@/app/api/assistant/explain/route');
    const { db: freshDb } = await import('@/lib/db');
    (freshDb as any).anomalyEvent.findUnique.mockResolvedValueOnce({ id: 'x' });
    const ZAI = await import('z-ai-web-dev-sdk');
    vi.mocked(ZAI.default?.create ?? ZAI.create).mockRejectedValueOnce(new Error('AI fail'));

    const req = new Request('http://localhost/api/assistant/explain', {
      method: 'POST',
      body: JSON.stringify({ type: 'anomaly', id: 'x' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req as any);
    expect(res.status).toBe(500);
  });
});
