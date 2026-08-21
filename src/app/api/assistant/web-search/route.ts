import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { z } from 'zod';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError } from '@/lib/api-auth';

const webSearchSchema = z.object({
  query: z.string().min(1).max(500),
  num: z.number().min(1).max(10).optional().default(5),
  summarize: z.boolean().optional().default(true),
});

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

export async function POST(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 15 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const body = await request.json();
    const parsed = webSearchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { query, num, summarize } = parsed.data;
    const zai = await getZai();

    // Step 1: Web search
    const searchResults = await zai.functions.invoke('web_search', {
      query,
      num,
    });

    const results = (Array.isArray(searchResults) ? searchResults : []).map(r => ({
      title: r.name || '',
      url: r.url || '',
      snippet: r.snippet || '',
      domain: r.host_name || '',
      date: r.date || '',
    }));

    // Step 2: AI summary (optional)
    let summary = '';
    if (summarize && results.length > 0) {
      const searchContext = results
        .slice(0, 5)
        .map((r, i) => `${i + 1}. ${r.title}\n${r.snippet}`)
        .join('\n\n');

      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content: `You are a telecom network intelligence analyst for NetOptima Algérie. Summarize the web search results concisely. Focus on telecom-relevant insights. If the results are not telecom-specific, summarize them as general context. Keep under 200 words. Respond in the same language as the query.`,
          },
          { role: 'user', content: `Query: "${query}"\n\nResults:\n${searchContext}` },
        ],
        thinking: { type: 'disabled' },
      });

      summary = completion.choices?.[0]?.message?.content || '';
    }

    return NextResponse.json({ results, summary, query });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
