import { NextResponse } from 'next/server';
import { checkApiAuth, authError } from '@/lib/api-auth';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get('entityType');
  const entityId = searchParams.get('entityId');

  const where: Record<string, unknown> = { isVisible: true };
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;

  const annotations = await db.sharedAnnotation.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ annotations });
}

export async function POST(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const body = await request.json();
  const { entityType, entityId, authorName, title, content, color, position } = body;

  if (!entityType || !title) {
    return NextResponse.json({ error: 'entityType and title required' }, { status: 400 });
  }

  const annotation = await db.sharedAnnotation.create({
    data: {
      entityType, entityId: entityId || null, authorName: authorName || 'Operator',
      title, content: content || '', color: color || '#f59e0b',
      position: JSON.stringify(position || {}),
    },
  });

  return NextResponse.json({ annotation }, { status: 201 });
}

export async function PATCH(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const body = await request.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.isVisible !== undefined) updateData.isVisible = data.isVisible;
  if (data.position !== undefined) updateData.position = JSON.stringify(data.position);

  const annotation = await db.sharedAnnotation.update({ where: { id }, data: updateData });
  return NextResponse.json({ annotation });
}

export async function DELETE(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await db.sharedAnnotation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
