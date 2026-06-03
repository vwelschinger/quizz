import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getEloHistory } from '@/lib/db/answers';
import EloChart from './EloChart';

export const dynamic = 'force-dynamic';

export default async function StatsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const history = await getEloHistory(user.id);

  const series =
    history.length > 0 ? [history[0].eloBefore, ...history.map((h) => h.eloAfter)] : [];
  const start = series[0] ?? user.elo;
  const current = series[series.length - 1] ?? user.elo;
  const totalDelta = current - start;

  // Liste numérotée chronologiquement, affichée de la plus récente à la plus ancienne.
  const rows = history.map((h, i) => ({ ...h, index: i + 1 })).reverse();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-[18px] pb-[42px] pt-[60px]">
      <div className="mb-4">
        <Link href="/" className="text-[12px] font-semibold text-ink-2 underline">
          ← Tableau de bord
        </Link>
      </div>
      <header className="mb-5">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-deep">
          Progression
        </div>
        <h1 className="font-disp text-[40px] uppercase leading-[0.9] tracking-disp">Mes stats</h1>
      </header>

      {history.length === 0 ? (
        <p className="card-hard p-6 text-center text-[14px] text-ink-2">
          Réponds à des questions pour voir ton évolution ELO.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-[10px]">
            <div className="card-hard p-3 text-center">
              <div className="font-disp text-[24px] tracking-disp">{start}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.04em] text-ink-2">
                Départ
              </div>
            </div>
            <div className="card-hard p-3 text-center">
              <div className="font-disp text-[24px] tracking-disp">{current}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.04em] text-ink-2">
                Actuel
              </div>
            </div>
            <div className="card-hard p-3 text-center">
              <div
                className={`font-disp text-[24px] tracking-disp ${totalDelta >= 0 ? 'text-success' : 'text-fail'}`}
              >
                {totalDelta >= 0 ? `+${totalDelta}` : totalDelta}
              </div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.04em] text-ink-2">
                Variation
              </div>
            </div>
          </div>

          <section className="mt-4 border-[3px] border-ink bg-card p-3 shadow-hard">
            <div className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-2">
              ELO selon le nombre de questions
            </div>
            <EloChart series={series} />
          </section>

          <section className="mt-5">
            <h2 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-2">
              Questions répondues · {history.length}
            </h2>
            <div className="flex flex-col gap-[8px]">
              {rows.map((r) => (
                <div key={r.questionId} className="card-hard p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold leading-snug">
                        <span className="text-ink-3">#{r.index}</span> {r.prompt}
                      </div>
                      <div className="mt-1 text-[11px] font-semibold text-ink-2">
                        ELO question {r.questionElo} ·{' '}
                        {r.isCorrect ? (
                          <span className="text-success">Juste</span>
                        ) : (
                          <span className="text-fail">Faux</span>
                        )}{' '}
                        · ELO {r.eloAfter}
                      </div>
                    </div>
                    <div
                      className={`shrink-0 font-disp text-[18px] tracking-disp ${r.eloDelta >= 0 ? 'text-success' : 'text-fail'}`}
                    >
                      {r.eloDelta >= 0 ? `+${r.eloDelta}` : r.eloDelta}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
