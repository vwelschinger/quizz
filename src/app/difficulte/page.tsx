import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { DIFFICULTY_LEVELS } from '@/lib/quiz/scoring';

export const dynamic = 'force-dynamic';

export default async function DifficultyPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-[18px] pb-[42px] pt-[60px]">
      <div className="mb-4">
        <Link href="/" className="text-[12px] font-semibold text-ink-2 underline">
          ← Tableau de bord
        </Link>
      </div>

      <header className="mb-4">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-deep">
          Entraînement ciblé
        </div>
        <h1 className="font-disp text-[40px] uppercase leading-[0.9] tracking-disp">
          Par difficulté
        </h1>
        <p className="mt-2 text-[13px] font-semibold text-ink-2">
          Choisis un niveau : la série ne portera que sur des questions de cette difficulté.
        </p>
      </header>

      {/* Note ELO : le scoring ne change pas, seules les questions proposées changent. */}
      <div className="mb-5 border-[3px] border-ink bg-brand-soft px-3 py-3 shadow-hard">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink-2">
          Le score reste à l&apos;ELO
        </div>
        <p className="mt-1 text-[12px] font-semibold leading-snug text-ink-2">
          Choisir une difficulté ne change pas le calcul des points : une question facile rapporte
          (ou retire) peu d&apos;ELO, une question difficile beaucoup plus. C&apos;est juste un moyen
          de t&apos;entraîner sur le niveau de ton choix.
        </p>
      </div>

      <div className="flex flex-col gap-[10px]">
        {DIFFICULTY_LEVELS.map((lvl) => (
          <Link
            key={lvl.rank}
            href={`/quiz?category=${lvl.category}&difficulty=${lvl.difficulty}`}
            className="flex items-center gap-3 border-[3px] border-ink bg-card p-3 shadow-hard"
          >
            <span
              className={`diff-badge diff-badge--lvl${lvl.rank} h-[40px] w-[40px] shrink-0 items-center justify-center !px-0 text-[18px]`}
            >
              {lvl.rank}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-disp text-[20px] uppercase leading-none tracking-disp">
                {lvl.label.split(' - ')[0]}
              </div>
              <div className="mt-[3px] text-[10.5px] font-bold uppercase tracking-[0.04em] text-ink-3">
                Niveau {lvl.rank} / 6 · {lvl.category === 'expert' ? 'Expert' : 'Abordable'}
              </div>
            </div>
            <span className="shrink-0 font-disp text-[14px] uppercase tracking-disp text-ink-3">
              Jouer →
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
