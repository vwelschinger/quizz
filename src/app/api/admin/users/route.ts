import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/guards';
import { listUsers, createUser, findUserByUsername } from '@/lib/db/users';
import { hashPassword } from '@/lib/auth/password';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  return NextResponse.json({ users: await listUsers() });
}

const createSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(6),
  role: z.enum(['user', 'admin']).optional(),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }

  if (await findUserByUsername(parsed.data.username)) {
    return NextResponse.json({ error: 'Utilisateur déjà existant' }, { status: 409 });
  }

  const hash = await hashPassword(parsed.data.password);
  const user = await createUser(parsed.data.username, hash, parsed.data.role ?? 'user');
  return NextResponse.json(
    {
      user: user
        ? { id: user.id, username: user.username, role: user.role, elo: user.elo }
        : null,
    },
    { status: 201 },
  );
}
