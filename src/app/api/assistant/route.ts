import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZai() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

export async function POST(request: NextRequest) {
  try {
    const { question, context } = await request.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    const zai = await getZai();

    const systemPrompt = `You are NetOptima AI Assistant, an expert in mobile network optimization (2G/3G/4G/5G). Help users diagnose network issues, interpret KPIs, suggest optimizations, and explain technical concepts. Be concise, actionable, and reference specific metrics when possible. Available data includes: RSRP, RSRQ, SINR, throughput, latency, availability, handover success rate, drop rate, PRB utilization, MOS score, energy consumption, and more.`;

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
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}