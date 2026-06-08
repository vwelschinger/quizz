import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { submitAnswer, getUserStats } from '@/lib/db/answers';
import { checkAndAwardBadges, recheckPodiumBadges } from '@/lib/badges/engine';

const schema = z.object({
  questionId: z.number().int().positive(),
  answer: z.string(),
  jokerId: z.string().optional(),
  attempt: z.union([z.literal(1), z.literal(2)]).optional(),
  declineSecondChance: z.boolean().optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }

  const result = await submitAnswer(user.id, parsed.data.questionId, parsed.data.answer, {
    jokerId: parsed.data.jokerId,
    attempt: parsed.data.attempt,
    declineSecondChance: parsed.data.declineSecondChance,
  });
  if (!result) {
    return NextResponse.json({ error: 'Question introuvable' }, { status: 404 });
  }

  // Esquive / proposition de Seconde chance : aucune ligne `answers` écrite → pas de badges à évaluer.
  if (result.skipped || result.offerSecondChance) {
    return NextResponse.json({ result, newBadges: [] });
  }

  const newBadges = await checkAndAwardBadges(user.id);
  // Le rang du joueur a pu changer → ré-évaluer le haut du classement (badges Podium).
  void recheckPodiumBadges();

  const stats = await getUserStats(user.id);
  return NextResponse.json({
    result,
    stats,
    newBadges: newBadges.map((b) => ({ id: b.id, name: b.name, description: b.description, tier: b.tier })),
  });
}
