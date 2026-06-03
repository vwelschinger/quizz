import { NextResponse } from 'next/server';
import { z } from 'zod';
import { findUserByUsername, createUser } from '@/lib/db/users';
import { hashPassword } from '@/lib/auth/password';
import { startSession } from '@/lib/auth/session';

// Inscription libre : l'utilisateur choisit son pseudo (identifiant) et son mot de passe.
const schema = z.object({
  username: z.string().trim().min(2).max(30),
  password: z.string().min(6).max(200),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Pseudo (2-30 caractères) et mot de passe (6+ caractères) requis.' },
      { status: 400 },
    );
  }

  const { username, password } = parsed.data;
  if (await findUserByUsername(username)) {
    return NextResponse.json({ error: 'Ce pseudo est déjà pris.' }, { status: 409 });
  }

  const hash = await hashPassword(password);
  const user = await createUser(username, hash, 'user');
  if (!user) {
    return NextResponse.json({ error: 'Création impossible.' }, { status: 500 });
  }

  await startSession(user.id);
  return NextResponse.json(
    { user: { id: user.id, username: user.username, role: user.role, elo: user.elo } },
    { status: 201 },
  );
}
