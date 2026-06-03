import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { deleteUser } from '@/lib/db/users';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 });
  }
  if (userId === admin.id) {
    return NextResponse.json({ error: 'Impossible de supprimer son propre compte' }, { status: 400 });
  }

  await deleteUser(userId);
  return NextResponse.json({ ok: true });
}
