import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { question, context } = await request.json();

    const { ChatCompletion } = await import('z-ai-web-dev-sdk');

    const systemPrompt = `You are NetOptima AI Assistant, an expert in mobile network optimization (2G/3G/4G/5G). Help users diagnose network issues, interpret KPIs, suggest optimizations, and explain technical concepts. Be concise, actionable, and reference specific metrics when possible. Available data includes: RSRP, RSRQ, SINR, throughput, latency, availability, handover success rate, drop rate, PRB utilization, MOS score, energy consumption, and more.`;

    const userContent = context ? `${question}\n\nContext: ${context}` : question;

    const completion = await ChatCompletion.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      max_tokens: 2048,
      temperature: 0.7,
    });

    const answer = completion.choices?.[0]?.message?.content || 'No response generated.';

    return NextResponse.json({ answer });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}