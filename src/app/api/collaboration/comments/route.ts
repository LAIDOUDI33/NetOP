import { NextResponse } from 'next/server';
import { checkApiAuth, authError } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { triggerCommentAdded } from '@/lib/notification-triggers';

export async function GET(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get('entityType');
  const entityId = searchParams.get('entityId');

  if (!entityType || !entityId) {
    return NextResponse.json({ error: 'entityType and entityId required' }, { status: 400 });
  }

  const comments = await db.collaborationComment.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ comments });
}

export async function POST(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const body = await request.json();
  const { entityType, entityId, authorName, content, parentId } = body;

  if (!entityType || !entityId || !content) {
    return NextResponse.json({ error: 'entityType, entityId, and content required' }, { status: 400 });
  }

  const comment = await db.collaborationComment.create({
    data: { entityType, entityId, authorName: authorName || 'Operator', content, parentId: parentId || null },
  });

  // Fire notification (non-blocking)
  triggerCommentAdded(entityType, entityId, authorName || 'Operator', content).catch(() => {});

  return NextResponse.json({ comment }, { status: 201 });
}

export async function DELETE(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await db.collaborationComment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
