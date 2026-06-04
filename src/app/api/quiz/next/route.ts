import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import {
  pickNextQuestionForUser,
  toPublicQuestion,
  countQuestions,
} from '@/lib/db/questions';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const theme = new URL(req.url).searchParams.get('theme')?.trim() || null;
  const row = await pickNextQuestionForUser(user.id, user.elo, theme);
  if (!row) {
    const total = await countQuestions();
    // exhausted=true : il y a des questions mais l'utilisateur a tout répondu.
    return NextResponse.json({ question: null, exhausted: total > 0, total });
  }
  return NextResponse.json({ question: toPublicQuestion(row) });
}
