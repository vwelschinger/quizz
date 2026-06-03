import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { deleteNotification } from '@/lib/db/notifications';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const { id } = await params;
  const nid = Number(id);
  if (!Number.isInteger(nid)) return NextResponse.json({ error: 'Invalide' }, { status: 400 });
  await deleteNotification(user.id, nid);
  return NextResponse.json({ ok: true });
}
