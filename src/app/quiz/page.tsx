import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import type { Category, Difficulty } from '@/lib/quiz/config';
import { getUserJokers } from '@/lib/jokers/ledger';
import { getJoker } from '@/lib/jokers/catalog';
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

  // Jokers solo possédés (pour le sélecteur en cours de partie).
  const soloJokers = (await getUserJokers(user.id))
    .filter((j) => {
      const def = getJoker(j.joker_id);
      return def && def.kind === 'consumable' && def.scope === 'solo';
    })
    .map((j) => ({ id: j.joker_id, qty: j.qty }));

  const category =
    sp.category && CATEGORIES.includes(sp.category as Category) ? (sp.category as Category) : null;
  const difficulty =
    sp.difficulty && DIFFICULTIES.includes(sp.difficulty as Difficulty)
      ? (sp.difficulty as Difficulty)
      : null;

  return (
    <QuizRunner
      theme={sp.theme?.trim() || null}
      category={category}
      difficulty={difficulty}
      jokers={soloJokers}
    />
  );
}
