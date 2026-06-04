import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { findUserById } from '@/lib/db/users';
import { getUserStats, getThemeBreakdown, listAnsweredQuestions } from '@/lib/db/answers';
import { getBattleStatsForUser } from '@/lib/db/battles';
import { getUserRank } from '@/lib/db/leaderboard';
import { getOwnedBadgeIds } from '@/lib/badges/engine';
import { BADGES } from '@/lib/badges/catalog';
import { playerTier } from '@/lib/quiz/tier';
import { GeoMark, themeMark } from '../../GeoMark';
import ChallengeButton from '../../classement/ChallengeButton';

export const dynamic = 'force-dynamic';

function StatCard({
  value,
  label,
  alt = false,
}: {
  value: React.ReactNode;
  label: string;
  alt?: boolean;
}) {
  return (
    <div
      className={`px-[12px] pb-[8px] pt-[8px] ${
        alt ? 'border-[3px] border-ink bg-ink shadow-hard-blue' : 'card-hard'
      }`}
    >
      <div
        className={`font-disp text-[24px] leading-[0.9] tracking-disp ${alt ? 'text-cream' : ''}`}
      >
        {value}
      </div>
      <div
        className={`mt-[3px] text-[10.5px] font-bold uppercase leading-[1.15] tracking-[0.03em] ${
          alt ? 'text-ink-3' : 'text-ink-2'
        }`}
      >
        {label}
      </div>
    </div>
  );
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect('/login');

  const { id } = await params;
  const playerId = Number(id);
  if (!Number.isInteger(playerId)) notFound();

  const player = await findUserById(playerId);
  if (!player) notFound();

  const [stats, battles, owned, themes, questions] = await Promise.all([
    getUserStats(player.id),
    getBattleStatsForUser(player.id),
    getOwnedBadgeIds(player.id),
    getThemeBreakdown(player.id),
    listAnsweredQuestions(player.id, 100),
  ]);
  const isAdmin = player.role === 'admin';
  const rank = isAdmin ? null : await getUserRank(player.elo);
  const tier = playerTier(player.elo);
  const ownedBadges = BADGES.filter((b) => owned.has(b.id));
  const isSelf = me.id === player.id;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-[18px] pb-[42px] pt-[60px]">
      <div className="mb-4">
        <Link href="/classement" className="text-[12px] font-semibold text-ink-2 underline">
          ← Classement
        </Link>
      </div>

      {/* ── En-tête joueur ── */}
      <header className="mb-5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-deep">
            {isAdmin ? 'Administrateur · hors classement' : `Rang #${rank?.rank} sur ${rank?.total}`}
          </div>
          <h1 className="break-words font-disp text-[44px] uppercase leading-[0.88] tracking-disp">
            {player.username}
            {isSelf && (
              <span className="ml-2 align-middle font-sans text-[11px] font-extrabold text-brand">
                TOI
              </span>
            )}
          </h1>
          <div className="mt-2 inline-block border-[3px] border-ink bg-card px-2 py-[2px] font-disp text-[13px] tracking-disp shadow-hard">
            {tier.name}
          </div>
        </div>
        {!isSelf && <ChallengeButton opponent={player.username} />}
      </header>

      {/* ── Stats généraux ── */}
      <h2 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-2">
        Stats généraux
      </h2>
      <section className="grid grid-cols-3 gap-[10px]">
        <StatCard value={player.elo} label="ELO" alt />
        <StatCard value={stats.answered} label="Questions" />
        <StatCard
          value={
            <>
              {stats.successRate}
              <span className="text-[15px] text-brand">%</span>
            </>
          }
          label="Réussite"
        />
        <StatCard value={stats.correct} label="Bonnes" />
        <StatCard value={stats.bonus} label="Points bonus" />
        <StatCard value={ownedBadges.length} label="Badges" />
      </section>

      {/* ── Batailles ── */}
      <h2 className="mb-2 mt-6 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-2">
        Batailles
      </h2>
      <div className="card-hard flex items-center justify-around px-3 py-3 text-center">
        <div>
          <div className="font-disp text-[26px] leading-none text-success">{battles.wins}</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-2">
            Victoires
          </div>
        </div>
        <div className="h-8 w-[2px] bg-ink/15" />
        <div>
          <div className="font-disp text-[26px] leading-none text-ink-2">{battles.draws}</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-2">
            Nuls
          </div>
        </div>
        <div className="h-8 w-[2px] bg-ink/15" />
        <div>
          <div className="font-disp text-[26px] leading-none text-fail">{battles.losses}</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-2">
            Défaites
          </div>
        </div>
      </div>

      {/* ── Badges ── */}
      <h2 className="mb-3 mt-6 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-2">
        Badges · {ownedBadges.length}
      </h2>
      {ownedBadges.length === 0 ? (
        <p className="text-[13px] text-ink-2">Aucun badge débloqué pour l&apos;instant.</p>
      ) : (
        <div className="grid grid-cols-4 gap-x-3 gap-y-4">
          {ownedBadges.map((b) => (
            <div key={b.id} className="flex flex-col items-center text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/badge-icons/${b.id}.svg`} alt={b.name} width={54} height={54} />
              <div className="mt-1 text-[9px] font-bold uppercase leading-tight text-ink">
                {b.name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Réussite par thème ── */}
      <h2 className="mb-3 mt-6 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-2">
        Réussite par thème
      </h2>
      {themes.length === 0 ? (
        <p className="text-[13px] text-ink-2">Pas encore de réponse par thème.</p>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {themes.map((t) => {
            const mark = themeMark(t.theme);
            return (
              <div key={t.theme} className="card-hard px-3 py-2">
                <div className="flex items-center gap-2">
                  <GeoMark shape={mark.shape} color={mark.color} size={14} />
                  <div className="min-w-0 flex-1 truncate font-disp text-[15px] uppercase tracking-disp">
                    {t.theme}
                  </div>
                  <div className="font-disp text-[15px] tracking-disp">{t.successRate}%</div>
                </div>
                <div className="mt-2 h-[8px] border-2 border-ink bg-paper">
                  <div className="h-full bg-brand" style={{ width: `${t.successRate}%` }} />
                </div>
                <div className="mt-1 text-[10px] font-semibold text-ink-3">
                  {t.correct}/{t.answered} bonnes réponses
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Questions répondues ── */}
      <h2 className="mb-3 mt-6 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-2">
        Questions répondues · {stats.answered}
      </h2>
      {questions.length === 0 ? (
        <p className="text-[13px] text-ink-2">Aucune question répondue.</p>
      ) : (
        <div className="flex flex-col gap-[8px]">
          {questions.map((q) => (
            <div
              key={q.questionId}
              className="border-[3px] border-l-[8px] border-ink bg-card px-3 py-2"
              style={{ borderLeftColor: q.isCorrect ? 'var(--success)' : 'var(--fail)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-semibold leading-snug">{q.prompt}</p>
                <span
                  className={`shrink-0 font-disp text-[13px] tracking-disp ${
                    q.eloDelta >= 0 ? 'text-success' : 'text-fail'
                  }`}
                >
                  {q.eloDelta >= 0 ? `+${q.eloDelta}` : q.eloDelta}
                </span>
              </div>

              <div className="mt-2 flex flex-col gap-[3px] border-t-2 border-[#e4dac6] pt-2">
                <div className="flex items-baseline gap-2">
                  <span className="w-[58px] shrink-0 text-[9px] font-extrabold uppercase tracking-[0.08em] text-ink-3">
                    Réponse
                  </span>
                  <span
                    className={`text-[12px] font-bold ${
                      q.isCorrect ? 'text-success' : 'text-fail line-through'
                    }`}
                  >
                    {q.chosenAnswer || '—'}
                  </span>
                </div>
                {!q.isCorrect && (
                  <div className="flex items-baseline gap-2">
                    <span className="w-[58px] shrink-0 text-[9px] font-extrabold uppercase tracking-[0.08em] text-ink-3">
                      Bonne
                    </span>
                    <span className="text-[12px] font-bold text-success">{q.correctAnswer}</span>
                  </div>
                )}
              </div>

              {q.theme && (
                <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.06em] text-ink-3">
                  {q.theme}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
