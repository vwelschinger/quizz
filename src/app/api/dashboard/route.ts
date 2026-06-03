import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserStats } from '@/lib/db/answers';
import { countQuestions } from '@/lib/db/questions';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const stats = await getUserStats(user.id);
  const totalQuestions = await countQuestions();
  return NextResponse.json({
    user: { username: user.username, elo: user.elo, role: user.role },
    stats,
    totalQuestions,
  });
}
