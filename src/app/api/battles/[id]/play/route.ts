import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { playBattle, getBattleReview } from '@/lib/db/battles';

const schema = z.object({
  answers: z.array(z.object({ questionId: z.number().int(), answer: z.string() })),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { id } = await params;
  const battleId = Number(id);
  if (!Number.isInteger(battleId)) {
    return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });

  const result = await playBattle(battleId, user.id, parsed.data.answers);
  if ('error' in result) return NextResponse.json(result, { status: 400 });
  if (result.status === 'finished') {
    const review = await getBattleReview(battleId, user.id);
    return NextResponse.json({ ...result, review });
  }
  return NextResponse.json(result);
}
