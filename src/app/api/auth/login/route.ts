import { NextResponse } from 'next/server';
import { z } from 'zod';
import { findUserByUsername, recordLogin } from '@/lib/db/users';
import { verifyPassword } from '@/lib/auth/password';
import { startSession } from '@/lib/auth/session';

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }

  const user = await findUserByUsername(parsed.data.username);
  if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) {
    return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
  }

  await startSession(user.id);

  // Suivi des connexions (best-effort, ne bloque pas le login).
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip');
  const userAgent = req.headers.get('user-agent');
  void recordLogin(user.id, ip ?? null, userAgent).catch(() => {});

  return NextResponse.json({
    user: { id: user.id, username: user.username, role: user.role, elo: user.elo },
  });
}
