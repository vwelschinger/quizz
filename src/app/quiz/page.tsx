import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import type { Category, Difficulty } from '@/lib/quiz/config';
import QuizRunner from './QuizRunner';

export const dynamic = 'force-dynamic';

const CATEGORIES: Category[] = ['abordable', 'expert'];
const DIFFICULTIES: Difficulty[] = ['low', 'middle', 'high'];

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string; category?: string; difficulty?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const sp = await searchParams;

  const category =
    sp.category && CATEGORIES.includes(sp.category as Category) ? (sp.category as Category) : null;
  const difficulty =
    sp.difficulty && DIFFICULTIES.includes(sp.difficulty as Difficulty)
      ? (sp.difficulty as Difficulty)
      : null;

  return (
    <QuizRunner theme={sp.theme?.trim() || null} category={category} difficulty={difficulty} />
  );
}
