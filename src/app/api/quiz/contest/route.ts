import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { createContestation } from '@/lib/db/contestations';

const schema = z.object({ questionId: z.number().int().positive() });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });

  const res = await createContestation(user.id, parsed.data.questionId);
  if (!res.ok) return NextResponse.json({ error: res.reason }, { status: 400 });
  return NextResponse.json({ ok: true });
}
