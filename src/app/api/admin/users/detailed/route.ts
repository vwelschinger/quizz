import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { listUsersDetailed } from '@/lib/db/users';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  return NextResponse.json({ users: await listUsersDetailed() });
}
