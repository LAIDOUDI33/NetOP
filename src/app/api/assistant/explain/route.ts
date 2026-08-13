import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { z } from 'zod';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { db } from '@/lib/db';
import { checkApiAuth, authError } from '@/lib/api-auth';

const explainSchema = z.object({
  type: z.enum(['anomaly', 'prediction']),
  id: z.string().min(1),
});

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

async function fetchRecord(type: string, id: string) {
  if (type === 'anomaly') {
    return db.anomalyEvent.findUnique({ where: { id }, include: { site: { select: { name: true, region: true, technology: true } } } });
  }
  const cap = await db.capacityForecast.findUnique({ where: { id }, include: { site: { select: { name: true, region: true } } } });
  if (cap) return { ...cap, _model: 'capacityForecast' };
  const fault = await db.faultPrediction.findUnique({ where: { id }, include: { site: { select: { name: true, region: true } } } });
  if (fault) return { ...fault, _model: 'faultPrediction' };
  const churn = await db.churnPrediction.findUnique({ where: { id } });
  if (churn) return { ...churn, _model: 'churnPrediction' };
  return null;
}

export async function POST(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const body = await request.json();
    const parsed = explainSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { type, id } = parsed.data;
    const record = await fetchRecord(type, id);
    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    const zai = await getZai();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: `You are a telecom network expert. Explain this ${type} in simple terms for a NOC operator. What does it mean? Why did it happen? What should be done? Keep under 150 words.` },
        { role: 'user', content: JSON.stringify(record) },
      ],
      thinking: { type: 'disabled' },
    });

    const explanation = completion.choices?.[0]?.message?.content || 'No explanation generated.';
    return NextResponse.json({ explanation, type, id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
