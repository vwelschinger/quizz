import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { listOpponents } from '@/lib/db/users';
import { listThemes } from '@/lib/db/questions';
import ThemeBattleForm from './ThemeBattleForm';

export const dynamic = 'force-dynamic';

export default async function ThemeBattlePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const [opponents, themes] = await Promise.all([listOpponents(user.id), listThemes()]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-[18px] pb-[42px] pt-[60px]">
      <div className="mb-4">
        <Link href="/bataille" className="text-[12px] font-semibold text-ink-2 underline">
          ← Batailles
        </Link>
      </div>
      <header className="mb-5">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-deep">
          Duel ciblé
        </div>
        <h1 className="font-disp text-[40px] uppercase leading-[0.9] tracking-disp">
          Bataille à thème
        </h1>
        <p className="mt-2 text-[13px] font-semibold text-ink-2">
          Affronte un joueur sur un thème précis : toutes les questions du duel en seront issues.
        </p>
      </header>

      <ThemeBattleForm opponents={opponents} themes={themes} />
    </main>
  );
}
