import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/guards';
import { deleteUser, updateUserElo } from '@/lib/db/users';
import { checkAndAwardBadges, recheckPodiumBadges } from '@/lib/badges/engine';

const patchSchema = z.object({ elo: z.number().int().min(0).max(5000) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'ELO invalide (0-5000)' }, { status: 400 });

  await updateUserElo(userId, parsed.data.elo);
  // Un ELO fixé manuellement peut créer/défaire des paliers ELO et bousculer le podium.
  await checkAndAwardBadges(userId);
  void recheckPodiumBadges();
  return NextResponse.json({ ok: true });
}

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
