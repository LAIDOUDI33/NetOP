import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { z } from 'zod';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

const assistantSchema = z.object({
  question: z.string().min(1),
  context: z.string().optional(),
  currentView: z.string().optional(),
  viewData: z.string().optional(),
});

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZai() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

export async function POST(request: NextRequest) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const body = await request.json();
    const parsed = assistantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const { question, context, currentView, viewData } = parsed.data;

    const zai = await getZai();

    let systemPrompt =
      'You are NetOptima Algérie AI Assistant, an expert in mobile network optimization (2G/3G/4G/5G) deployed in Algeria. Help users diagnose network issues, interpret KPIs, suggest optimizations, and explain technical concepts. Be concise, actionable, and reference specific metrics when possible. Available data includes: RSRP, RSRQ, SINR, throughput, latency, availability, handover success rate, drop rate, PRB utilization, MOS score, energy consumption, and more.';

    if (currentView) {
      systemPrompt += `\n\nThe user is currently viewing the '${currentView}' module. Tailor your response to be relevant to this view. Provide specific data-driven insights when possible.`;
    }

    if (viewData) {
      systemPrompt += `\n\nCurrent view data summary: ${viewData}`;
    }

    const userContent = context ? `${question}\n\nContext: ${context}` : question;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      thinking: { type: 'disabled' },
    });

    const answer = completion.choices?.[0]?.message?.content || 'No response generated.';
    return NextResponse.json({ answer });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
