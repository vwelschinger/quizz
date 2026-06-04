import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { findUserByUsername } from '@/lib/db/users';
import { createBattle } from '@/lib/db/battles';

const schema = z.object({
  opponent: z.string().trim().min(1),
  size: z.number().int().min(1).max(10).optional(),
  theme: z.string().trim().min(1).optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });

  const opponent = await findUserByUsername(parsed.data.opponent);
  if (!opponent) return NextResponse.json({ error: 'Adversaire introuvable' }, { status: 404 });
  if (opponent.id === user.id) {
    return NextResponse.json({ error: 'Tu ne peux pas te défier toi-même' }, { status: 400 });
  }

  const battle = await createBattle(
    user.id,
    opponent.id,
    parsed.data.size ?? 10,
    user.username,
    parsed.data.theme ?? null,
  );
  if (!battle) {
    return NextResponse.json(
      {
        error: parsed.data.theme
          ? `Pas assez de questions disponibles pour le thème « ${parsed.data.theme} ».`
          : 'Pas assez de questions disponibles pour une bataille (lance une synchro).',
      },
      { status: 409 },
    );
  }
  return NextResponse.json({ battleId: battle.id }, { status: 201 });
}
