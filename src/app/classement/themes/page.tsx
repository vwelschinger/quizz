import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getThemeLeaderboard, type ThemeLeaderboardEntry } from '@/lib/db/leaderboard';
import { listThemes } from '@/lib/db/questions';
import ChallengeButton from '../ChallengeButton';

export const dynamic = 'force-dynamic';

export default async function ThemeLeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const sp = await searchParams;
  const themes = await listThemes();
  // Thème sélectionné : celui de l'URL s'il existe, sinon le plus fourni.
  const selected =
    (sp.theme && themes.some((t) => t.theme === sp.theme) && sp.theme) || themes[0]?.theme || null;
  const rows = selected ? await getThemeLeaderboard(selected, 100) : [];

  function Row({ r, rank }: { r: ThemeLeaderboardEntry; rank: number }) {
    const me = r.id === user!.id;
    return (
      <div
        className={`flex items-center gap-3 border-[3px] border-ink p-3 ${
          me ? 'bg-ink text-cream shadow-hard-blue' : 'bg-card shadow-hard'
        }`}
      >
        <Link href={`/joueur/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className={`w-9 shrink-0 text-center font-disp text-[26px] leading-none ${
              rank <= 3 ? 'text-brand' : me ? 'text-cream' : 'text-ink-3'
            }`}
          >
            {rank}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-disp text-[20px] uppercase leading-none tracking-disp">
              {r.username}
              {me && (
                <span className="ml-2 align-middle font-sans text-[10px] font-extrabold text-brand-light">
                  TOI
                </span>
              )}
            </div>
            <div
              className={`mt-1 text-[11px] font-semibold uppercase tracking-[0.04em] ${
                me ? 'text-ink-3' : 'text-ink-2'
              }`}
            >
              {r.answered} questions · {r.successRate}%
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-disp text-[22px] leading-none tracking-disp">{r.correct}</div>
            <div className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-ink-3">Bonnes</div>
          </div>
        </Link>
        {!me && <ChallengeButton opponent={r.username} />}
      </div>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-[18px] pb-[42px] pt-[60px]">
      <div className="mb-4">
        <Link href="/classement" className="text-[12px] font-semibold text-ink-2 underline">
          ← Classement général
        </Link>
      </div>

      <header className="mb-4">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-deep">
          Communauté
        </div>
        <h1 className="font-disp text-[40px] uppercase leading-[0.9] tracking-disp">Par thème</h1>
      </header>

      {/* Sélecteur de thème */}
      <div className="mb-5 flex flex-wrap gap-2">
        {themes.map((t) => {
          const active = t.theme === selected;
          return (
            <Link
              key={t.theme}
              href={`/classement/themes?theme=${encodeURIComponent(t.theme)}`}
              className={`border-[2px] border-ink px-2 py-1 font-disp text-[12px] uppercase tracking-disp ${
                active ? 'bg-ink text-cream shadow-hard-blue' : 'bg-card shadow-hard'
              }`}
            >
              {t.theme}
            </Link>
          );
        })}
      </div>

      {selected && (
        <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.04em] text-ink-2">
          Classement — {selected}
        </div>
      )}

      <div className="flex flex-col gap-[10px]">
        {rows.map((r, i) => (
          <Row key={r.id} r={r} rank={i + 1} />
        ))}
        {rows.length === 0 && (
          <p className="text-center text-ink-2">
            {themes.length === 0
              ? 'Aucun thème disponible.'
              : 'Personne n’a encore répondu dans ce thème.'}
          </p>
        )}
      </div>
    </main>
  );
}
