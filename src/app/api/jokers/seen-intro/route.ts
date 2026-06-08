import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { query } from '@/lib/db/pool';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  await query('UPDATE users SET seen_jokers_intro = true WHERE id = $1', [user.id]);
  return NextResponse.json({ ok: true });
}
