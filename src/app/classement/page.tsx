import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getLeaderboard, getAdminBoard, type LeaderboardEntry } from '@/lib/db/leaderboard';
import ChallengeButton from './ChallengeButton';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const [rows, admins] = await Promise.all([getLeaderboard(100), getAdminBoard(100)]);

  function Row({ r, rank }: { r: LeaderboardEntry; rank: number | null }) {
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
              rank == null ? 'text-ink-3' : rank <= 3 ? 'text-brand' : me ? 'text-cream' : 'text-ink-3'
            }`}
          >
            {rank == null ? '—' : rank}
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
              {r.answered} questions · {r.successRate}% · 🏅 {r.badges}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-disp text-[22px] leading-none tracking-disp">{r.elo}</div>
            <div className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-ink-3">ELO</div>
          </div>
        </Link>
        {!me && <ChallengeButton opponent={r.username} />}
      </div>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-[18px] pb-[42px] pt-[60px]">
      <div className="mb-4">
        <Link href="/" className="text-[12px] font-semibold text-ink-2 underline">
          ← Tableau de bord
        </Link>
      </div>

      <header className="mb-5">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-deep">
          Communauté
        </div>
        <h1 className="font-disp text-[40px] uppercase leading-[0.9] tracking-disp">Classement</h1>
      </header>

      <div className="flex flex-col gap-[10px]">
        {rows.map((r, i) => (
          <Row key={r.id} r={r} rank={i + 1} />
        ))}
        {rows.length === 0 && (
          <p className="text-center text-ink-2">Aucun joueur classé pour l&apos;instant.</p>
        )}
      </div>

      {admins.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-3">
            Hors classement — admin
          </h2>
          <div className="flex flex-col gap-[10px] opacity-90">
            {admins.map((r) => (
              <Row key={r.id} r={r} rank={null} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
