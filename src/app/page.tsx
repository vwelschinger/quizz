import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserStats, getRecentEloTrend, getCurrentStreak, getDailyStreak } from '@/lib/db/answers';
import { countQuestions } from '@/lib/db/questions';
import { countPendingBattlesForUser, getBattleStatsForUser } from '@/lib/db/battles';
import { getUserRank } from '@/lib/db/leaderboard';
import { playerTier } from '@/lib/quiz/tier';
import EmojiAvatar from './EmojiAvatar';
import LogoutButton from './LogoutButton';
import NotificationMenu from './NotificationMenu';

export const dynamic = 'force-dynamic';

type Shape = 'square' | 'ring' | 'tri' | 'star';

// Icônes géométriques pleines (iconographie constructiviste).
function GeoMark({ shape, color = '#1A1611', size = 16 }: { shape: Shape; color?: string; size?: number }) {
  if (shape === 'square')
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
        <rect x="2" y="2" width="12" height="12" fill={color} />
      </svg>
    );
  if (shape === 'ring')
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
        <circle cx="8" cy="8" r="6" fill="none" stroke={color} strokeWidth="3" />
      </svg>
    );
  if (shape === 'tri')
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
        <path d="M8 1l7 13H1z" fill={color} />
      </svg>
    );
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <path d="M8 0l2.2 5.8L16 8l-5.8 2.2L8 16l-2.2-5.8L0 8l5.8-2.2z" fill={color} />
    </svg>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [stats, trend, streak, totalQuestions, pendingBattles, rank, battleStats, dailyStreak] =
    await Promise.all([
      getUserStats(user.id),
      getRecentEloTrend(user.id),
      getCurrentStreak(user.id),
      countQuestions(),
      countPendingBattlesForUser(user.id),
      getUserRank(user.elo),
      getBattleStatsForUser(user.id),
      getDailyStreak(user.id),
    ]);
  const tier = playerTier(user.elo);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-[18px] pb-[42px] pt-[60px]">
      {/* ── Header ── */}
      <header className="mb-6 flex items-start justify-between">
        <div className="relative">
          <div className="text-[14px] font-extrabold tracking-[0.16em] text-ink-2">SALUT,</div>
          <div className="mt-[2px] break-words font-disp text-[52px] uppercase leading-[0.86] tracking-disp">
            {user.username}
          </div>
          <div className="mt-2 h-[9px] w-[76px] bg-brand" />
        </div>
        <div className="flex items-center gap-2">
          <NotificationMenu />
          <EmojiAvatar />
        </div>
      </header>

      {/* ── Bloc ELO héros ── */}
      <section className="relative mb-[18px] overflow-hidden border-[3px] border-ink bg-elo-grad px-5 pb-5 pt-[18px] text-cream shadow-hard-lg">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-[150px] -top-[150px] h-[380px] w-[380px]"
          style={{
            background:
              'repeating-radial-gradient(circle, transparent 0 16px, rgba(255,255,255,0.12) 16px 19px)',
          }}
        />
        <div className="relative z-[1]">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-extrabold tracking-[0.16em]">SCORE ELO</span>
            {trend !== 0 && (
              <span className="flex items-center gap-[5px] bg-ink px-[9px] pb-[2px] pt-1 font-disp text-[15px] tracking-disp">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M7 13L7 1M7 1L2 6M7 1L12 6" />
                </svg>
                {trend > 0 ? `+${trend}` : trend}
              </span>
            )}
          </div>

          <div className="mb-[16px] mt-[10px] font-disp text-[76px] leading-[0.86] tracking-[1px]">
            {user.elo}
          </div>

          <div className="flex items-center gap-[10px]">
            <span className="bg-cream px-[9px] pb-[2px] pt-1 font-disp text-[13px] tracking-disp text-ink">
              {tier.name}
            </span>
            <div className="h-[10px] flex-1 border-2 border-ink bg-black/[0.28]">
              <div className="h-full bg-cream" style={{ width: `${tier.progress}%` }} />
            </div>
            <span className="font-disp text-[14px] tracking-disp">{tier.next ?? 'MAX'}</span>
          </div>
        </div>
      </section>

      {/* ── Série quotidienne (revenir chaque jour) ── */}
      {dailyStreak.days > 0 ? (
        <div className="mb-[14px] flex items-center gap-[10px] border-[3px] border-ink bg-brand-soft px-3 py-2 shadow-hard">
          <span className="text-[22px] leading-none">🔥</span>
          <div className="text-[13px] font-bold leading-tight">
            {dailyStreak.days} jour{dailyStreak.days > 1 ? 's' : ''} d&apos;affilée
            <span className="block text-[11px] font-semibold text-ink-2">
              {dailyStreak.playedToday
                ? 'Reviens demain pour continuer ta série !'
                : "Joue aujourd'hui pour ne pas la perdre !"}
            </span>
          </div>
        </div>
      ) : (
        <div className="mb-[14px] flex items-center gap-[10px] border-[3px] border-ink bg-card px-3 py-2 shadow-hard">
          <span className="text-[22px] leading-none">🔥</span>
          <div className="text-[13px] font-bold leading-tight">
            Commence ta série
            <span className="block text-[11px] font-semibold text-ink-2">
              Joue aujourd&apos;hui, puis reviens chaque jour !
            </span>
          </div>
        </div>
      )}

      {/* ── Grille de stats 2×2 ── */}
      <section className="grid grid-cols-2 auto-rows-fr gap-[14px]">
        <div className="card-hard px-[14px] pb-[14px] pt-[13px]">
          <GeoMark shape="square" />
          <div className="mt-[10px] font-disp text-[34px] leading-[0.9] tracking-disp">{stats.answered}</div>
          <div className="mt-[7px] text-[11.5px] font-bold uppercase leading-[1.2] tracking-[0.04em] text-ink-2">
            Questions répondues
          </div>
        </div>

        <div className="card-hard px-[14px] pb-[14px] pt-[13px]">
          <GeoMark shape="ring" />
          <div className="mt-[10px] font-disp text-[34px] leading-[0.9] tracking-disp">
            {stats.successRate}
            <span className="text-[20px] text-brand">%</span>
          </div>
          <div className="mt-[7px] text-[11.5px] font-bold uppercase leading-[1.2] tracking-[0.04em] text-ink-2">
            Taux de réussite
          </div>
        </div>

        <div className="border-[3px] border-ink bg-ink px-[14px] pb-[14px] pt-[13px] shadow-hard-blue">
          <GeoMark shape="tri" color="#1E6499" />
          <div className="mt-[10px] font-disp text-[34px] leading-[0.9] tracking-disp text-cream">{stats.bonus}</div>
          <div className="mt-[7px] text-[11.5px] font-bold uppercase leading-[1.2] tracking-[0.04em] text-ink-3">
            Points bonus
          </div>
        </div>

        <div className="card-hard px-[14px] pb-[14px] pt-[13px]">
          <GeoMark shape="star" color="#1E6499" />
          <div className="mt-[10px] font-disp text-[34px] leading-[0.9] tracking-disp">{streak}</div>
          <div className="mt-[7px] text-[11.5px] font-bold uppercase leading-[1.2] tracking-[0.04em] text-ink-2">
            Bonnes d&apos;affilée
          </div>
        </div>

        <Link href="/classement" className="card-hard px-[14px] pb-[14px] pt-[13px]">
          <GeoMark shape="ring" color="#1E6499" />
          {user.role === 'admin' ? (
            <>
              <div className="mt-[10px] font-disp text-[34px] leading-[0.9] tracking-disp">—</div>
              <div className="mt-[7px] text-[11.5px] font-bold uppercase leading-[1.2] tracking-[0.04em] text-ink-2">
                Classement
              </div>
              <div className="mt-1 text-[11px] font-semibold text-ink-3">Admin (hors classement)</div>
            </>
          ) : (
            <>
              <div className="mt-[10px] font-disp text-[34px] leading-[0.9] tracking-disp">#{rank.rank}</div>
              <div className="mt-[7px] text-[11.5px] font-bold uppercase leading-[1.2] tracking-[0.04em] text-ink-2">
                Classement
              </div>
              <div className="mt-1 text-[11px] font-semibold text-ink-3">sur {rank.total} joueurs</div>
            </>
          )}
        </Link>

        <Link href="/bataille" className="card-hard px-[14px] pb-[14px] pt-[13px]">
          <GeoMark shape="square" />
          <div className="mt-[10px] font-disp text-[34px] leading-[0.9] tracking-disp">
            {battleStats.total}
          </div>
          <div className="mt-[7px] text-[11.5px] font-bold uppercase leading-[1.2] tracking-[0.04em] text-ink-2">
            Batailles
          </div>
          <div className="mt-1 text-[11px] font-bold">
            <span className="text-success">{battleStats.wins} V</span>
            <span className="text-ink-3"> · </span>
            <span className="text-fail">{battleStats.losses} D</span>
          </div>
        </Link>
      </section>

      <div className="min-h-[20px] flex-1" />

      {/* ── CTA ── */}
      <Link href="/quiz" className="cta-primary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M6 4l14 8-14 8V4z" />
        </svg>
        Lancer une session
      </Link>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Link
          href="/classement"
          className="flex h-[52px] items-center justify-center gap-2 border-[3px] border-ink bg-card font-disp text-[15px] uppercase tracking-disp shadow-hard"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 20V10M12 20V4M20 20v-6" />
          </svg>
          Classement
        </Link>
        <Link
          href="/bataille"
          className="relative flex h-[52px] items-center justify-center gap-2 border-[3px] border-ink bg-brand text-cream font-disp text-[15px] uppercase tracking-disp shadow-hard"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
          </svg>
          Bataille
          {pendingBattles > 0 && (
            <span className="absolute -right-2 -top-2 flex h-6 min-w-[24px] items-center justify-center rounded-full border-2 border-paper bg-fail px-1 font-sans text-[12px] font-bold leading-none text-white">
              {pendingBattles}
            </span>
          )}
        </Link>
      </div>

      <Link
        href="/stats"
        className="mt-3 flex h-[52px] items-center justify-center gap-2 border-[3px] border-ink bg-card font-disp text-[15px] uppercase tracking-disp shadow-hard"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 3v18h18" />
          <path d="M7 13l3.5-3.5 3 3L19 6" />
        </svg>
        Mes stats
      </Link>

      {totalQuestions === 0 && (
        <p className="mt-3 text-center text-[12px] font-semibold text-brand-deep">
          Aucune question en base — lance une synchro depuis la console admin.
        </p>
      )}

      <div className="mt-4 flex items-center justify-center gap-4 text-[12px] font-semibold text-ink-2">
        {user.role === 'admin' && (
          <Link href="/admin" className="underline">
            Console admin
          </Link>
        )}
        <LogoutButton />
      </div>
    </main>
  );
}
