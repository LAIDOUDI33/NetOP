import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkApiAuth, authError } from '@/lib/api-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/assistant/conversations/[id] — get conversation with messages
export async function GET(request: NextRequest, { params }: RouteParams) {
  try { await checkApiAuth(request); } catch { return authError(); }

  try {
    const { id } = await params;
    const conversation = await db.aiConversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, role: true, content: true, imageBase64: true, createdAt: true },
        },
      },
    });

    if (!conversation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({
      id: conversation.id,
      title: conversation.title,
      status: conversation.status,
      messageCount: conversation.messages.length,
      lastMessageAt: conversation.updatedAt.toISOString(),
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages: conversation.messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        imageBase64: m.imageBase64 ?? null,
        timestamp: m.createdAt.toISOString(),
      })),
    });
  } catch (__error) {
    return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
  }
}

// PATCH /api/assistant/conversations/[id] — rename or archive
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try { await checkApiAuth(request); } catch { return authError(); }

  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, string> = {};
    if (typeof body.title === 'string') updateData.title = body.title.slice(0, 100);
    if (typeof body.status === 'string' && ['active', 'archived', 'deleted'].includes(body.status)) {
      updateData.status = body.status;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const conversation = await db.aiConversation.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: conversation.id,
      title: conversation.title,
      status: conversation.status,
      updatedAt: conversation.updatedAt.toISOString(),
    });
  } catch (__error) {
    return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 });
  }
}

// DELETE /api/assistant/conversations/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try { await checkApiAuth(request); } catch { return authError(); }

  try {
    const { id } = await params;
    await db.aiConversation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
  }
}
