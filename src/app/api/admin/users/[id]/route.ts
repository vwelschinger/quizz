import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/guards';
import { deleteUser, updateUserElo } from '@/lib/db/users';
import { checkAndAwardBadges, recheckPodiumBadges } from '@/lib/badges/engine';
import { adminSetKopecks } from '@/lib/jokers/engine';

const patchSchema = z
  .object({
    elo: z.number().int().min(0).max(5000).optional(),
    kopecks: z.number().int().min(0).max(100_000_000).optional(),
  })
  .refine((d) => d.elo !== undefined || d.kopecks !== undefined, {
    message: 'Rien à modifier',
  });

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
  if (!parsed.success) return NextResponse.json({ error: 'Valeurs invalides' }, { status: 400 });

  if (parsed.data.elo !== undefined) {
    await updateUserElo(userId, parsed.data.elo);
    // Un ELO fixé manuellement peut créer/défaire des paliers ELO et bousculer le podium.
    await checkAndAwardBadges(userId);
    void recheckPodiumBadges();
  }
  if (parsed.data.kopecks !== undefined) {
    await adminSetKopecks(userId, parsed.data.kopecks);
  }
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
