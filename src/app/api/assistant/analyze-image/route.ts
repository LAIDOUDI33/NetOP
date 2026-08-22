import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { z } from 'zod';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError } from '@/lib/api-auth';

const analyzeImageSchema = z.object({
  image: z.string().min(1), // base64 or URL
  prompt: z.string().min(1).max(2000),
  isBase64: z.boolean().optional().default(false),
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
    const parsed = analyzeImageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { image, prompt, isBase64 } = parsed.data;
    const zai = await getZai();

    const imageUrl = isBase64 ? `data:image/jpeg;base64,${image}` : image;

    const response = await zai.chat.completions.createVision({
      model: 'default',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    });

    const analysis = response.choices?.[0]?.message?.content || 'No analysis generated.';
    return NextResponse.json({ analysis });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
