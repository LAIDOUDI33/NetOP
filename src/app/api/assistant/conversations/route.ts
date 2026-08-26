import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkApiAuth, authError } from '@/lib/api-auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

// GET /api/assistant/conversations — list conversations
export async function GET(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 60 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const conversations = await db.aiConversation.findMany({
      where: { status: 'active' },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, createdAt: true },
        },
      },
    });

    const result = conversations.map(c => ({
      id: c.id,
      title: c.title,
      status: c.status,
      messageCount: c._count.messages,
      lastMessageAt: c.messages[0]?.createdAt?.toISOString() ?? c.updatedAt.toISOString(),
      lastMessagePreview: c.messages[0]?.content?.slice(0, 80) ?? '',
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    return NextResponse.json(result);
  } catch (__error) {
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

// POST /api/assistant/conversations — create new conversation
export async function POST(request: NextRequest) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const body = await request.json();
    const title = body.title?.slice(0, 100) || 'New Chat';

    const conversation = await db.aiConversation.create({
      data: { title },
    });

    return NextResponse.json({
      id: conversation.id,
      title: conversation.title,
      status: conversation.status,
      messageCount: 0,
      lastMessageAt: conversation.updatedAt.toISOString(),
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (__error) {
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}
