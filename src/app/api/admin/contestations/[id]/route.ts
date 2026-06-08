import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/guards';
import { resolveContestation } from '@/lib/db/contestations';
import { checkAndAwardBadges, recheckPodiumBadges } from '@/lib/badges/engine';

const schema = z.object({ accept: z.boolean() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const { id } = await params;
  const contestationId = Number(id);
  if (!Number.isInteger(contestationId)) {
    return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });

  const userId = await resolveContestation(contestationId, parsed.data.accept, admin.id);
  if (!userId) {
    return NextResponse.json({ error: 'Contestation introuvable ou déjà traitée' }, { status: 404 });
  }
  // Une contestation acceptée recrédite l'ELO → ré-évaluer paliers ELO (joueur) et Podium (haut du classement).
  await checkAndAwardBadges(userId);
  void recheckPodiumBadges();
  return NextResponse.json({ ok: true });
}
