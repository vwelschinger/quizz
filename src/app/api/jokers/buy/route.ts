import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { purchaseJoker } from '@/lib/jokers/engine';
import { getBonusBalance, getUserJokers, getJokerPurchaseCounts } from '@/lib/jokers/ledger';

const schema = z.object({ jokerId: z.string() });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });

  try {
    await purchaseJoker(user.id, parsed.data.jokerId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Achat impossible';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const [balance, jokers, purchases] = await Promise.all([
    getBonusBalance(user.id),
    getUserJokers(user.id),
    getJokerPurchaseCounts(user.id),
  ]);
  return NextResponse.json({ balance, jokers, purchases });
}
