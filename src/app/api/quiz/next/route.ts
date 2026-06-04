import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import {
  pickNextQuestionForUser,
  toPublicQuestion,
  countQuestions,
} from '@/lib/db/questions';
import type { Category, Difficulty } from '@/lib/quiz/config';

const CATEGORIES: Category[] = ['abordable', 'expert'];
const DIFFICULTIES: Difficulty[] = ['low', 'middle', 'high'];

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const theme = params.get('theme')?.trim() || null;
  const categoryParam = params.get('category')?.trim() as Category | undefined;
  const difficultyParam = params.get('difficulty')?.trim() as Difficulty | undefined;
  const category = categoryParam && CATEGORIES.includes(categoryParam) ? categoryParam : null;
  const difficulty =
    difficultyParam && DIFFICULTIES.includes(difficultyParam) ? difficultyParam : null;

  const row = await pickNextQuestionForUser(user.id, user.elo, { theme, category, difficulty });
  if (!row) {
    const total = await countQuestions();
    // exhausted=true : il y a des questions mais l'utilisateur a tout répondu.
    return NextResponse.json({ question: null, exhausted: total > 0, total });
  }
  return NextResponse.json({ question: toPublicQuestion(row) });
}
