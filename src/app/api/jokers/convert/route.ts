import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { balleDansLePied, recyclage } from '@/lib/jokers/engine';
import { getBonusBalance, getUserJokers } from '@/lib/jokers/ledger';

const schema = z.object({
  type: z.union([z.literal('balle'), z.literal('recyclage')]),
  jokerId: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });

  try {
    if (parsed.data.type === 'balle') {
      await balleDansLePied(user.id);
    } else {
      if (!parsed.data.jokerId) {
        return NextResponse.json({ error: 'Joker à recycler manquant' }, { status: 400 });
      }
      await recyclage(user.id, parsed.data.jokerId);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Conversion impossible';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const [balance, jokers] = await Promise.all([getBonusBalance(user.id), getUserJokers(user.id)]);
  return NextResponse.json({ balance, jokers });
}
