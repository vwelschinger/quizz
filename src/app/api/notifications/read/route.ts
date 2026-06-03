import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { markNotificationsRead } from '@/lib/db/notifications';

const schema = z.object({ ids: z.array(z.number().int()).optional() });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body ?? {});
  const ids = parsed.success && parsed.data.ids ? parsed.data.ids : [];
  await markNotificationsRead(user.id, ids);
  return NextResponse.json({ ok: true });
}
