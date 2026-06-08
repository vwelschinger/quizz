import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserStats, getRecentEloTrend, getCurrentStreak, getDailyStreak } from '@/lib/db/answers';
import { countQuestions } from '@/lib/db/questions';
import { countPendingBattlesForUser, getBattleStatsForUser } from '@/lib/db/battles';
import { getUserRank } from '@/lib/db/leaderboard';
import { countUserBadges } from '@/lib/badges/engine';
import { BADGE_COUNT } from '@/lib/badges/catalog';
import { getBonusBalance, getUserJokers } from '@/lib/jokers/ledger';
import { hasSeenJokersIntro } from '@/lib/db/users';
import { playerTier } from '@/lib/quiz/tier';
import WalletHeader from './WalletHeader';
import JokersIntro from './JokersIntro';
import Mascotte from '@/components/Mascotte';
import LogoutButton from './LogoutButton';
import NotificationMenu from './NotificationMenu';
import { GeoMark } from './GeoMark';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [
    stats,
    trend,
    streak,
    totalQuestions,
    pendingBattles,
    rank,
    battleStats,
    dailyStreak,
    badgeCount,
    bonusBalance,
    jokers,
    seenJokersIntro,
  ] = await Promise.all([
    getUserStats(user.id),
    getRecentEloTrend(user.id),
    getCurrentStreak(user.id),
    countQuestions(),
    countPendingBattlesForUser(user.id),
    getUserRank(user.elo),
    getBattleStatsForUser(user.id),
    getDailyStreak(user.id),
    countUserBadges(user.id),
    getBonusBalance(user.id),
    getUserJokers(user.id),
    hasSeenJokersIntro(user.id),
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
          <WalletHeader balance={bonusBalance} jokers={jokers} />
        </div>
      </header>

      {!seenJokersIntro && <JokersIntro autoOpen />}

      <div className="mb-4 flex justify-center">
        <Mascotte size={104} />
      </div>

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

      {/* ── Grille de stats (compacte) ── */}
      <section className="grid grid-cols-2 auto-rows-fr gap-[12px]">
        <div className="card-hard px-[12px] pb-[7px] pt-[6px]">
          <GeoMark shape="square" size={13} />
          <div className="mt-[4px] font-disp text-[22px] leading-[0.9] tracking-disp">{stats.answered}</div>
          <div className="mt-[3px] text-[10.5px] font-bold uppercase leading-[1.15] tracking-[0.03em] text-ink-2">
            Questions répondues
          </div>
        </div>

        <div className="card-hard px-[12px] pb-[7px] pt-[6px]">
          <GeoMark shape="ring" size={13} />
          <div className="mt-[4px] font-disp text-[22px] leading-[0.9] tracking-disp">
            {stats.successRate}
            <span className="text-[16px] text-brand">%</span>
          </div>
          <div className="mt-[3px] text-[10.5px] font-bold uppercase leading-[1.15] tracking-[0.03em] text-ink-2">
            Taux de réussite
          </div>
        </div>

        <Link
          href="/badges"
          className="border-[3px] border-ink bg-ink px-[12px] pb-[7px] pt-[6px] shadow-hard-blue"
        >
          <GeoMark shape="star" color="#1E6499" size={13} />
          <div className="mt-[4px] font-disp text-[22px] leading-[0.9] tracking-disp text-cream">
            {badgeCount}
            <span className="text-[15px] text-[#9aa1a8]">/{BADGE_COUNT}</span>
          </div>
          <div className="mt-[3px] text-[10.5px] font-bold uppercase leading-[1.15] tracking-[0.03em] text-ink-3">
            Badges
          </div>
        </Link>

        <div className="card-hard px-[12px] pb-[7px] pt-[6px]">
          <GeoMark shape="star" color="#1E6499" size={13} />
          <div className="mt-[4px] font-disp text-[22px] leading-[0.9] tracking-disp">{streak}</div>
          <div className="mt-[3px] text-[10.5px] font-bold uppercase leading-[1.15] tracking-[0.03em] text-ink-2">
            Bonnes d&apos;affilée
          </div>
        </div>

        <Link href="/classement" className="card-hard px-[12px] pb-[7px] pt-[6px]">
          <GeoMark shape="ring" color="#1E6499" size={13} />
          {user.role === 'admin' ? (
            <>
              <div className="mt-[4px] font-disp text-[22px] leading-[0.9] tracking-disp">—</div>
              <div className="mt-[3px] text-[10.5px] font-bold uppercase leading-[1.15] tracking-[0.03em] text-ink-2">
                Classement
              </div>
              <div className="mt-[2px] text-[10px] font-semibold text-ink-3">Admin (hors classement)</div>
            </>
          ) : (
            <>
              <div className="mt-[4px] font-disp text-[22px] leading-[0.9] tracking-disp">#{rank.rank}</div>
              <div className="mt-[3px] text-[10.5px] font-bold uppercase leading-[1.15] tracking-[0.03em] text-ink-2">
                Classement
              </div>
              <div className="mt-[2px] text-[10px] font-semibold text-ink-3">sur {rank.total} joueurs</div>
            </>
          )}
        </Link>

        <Link href="/bataille" className="card-hard px-[12px] pb-[7px] pt-[6px]">
          <GeoMark shape="square" size={13} />
          <div className="mt-[4px] font-disp text-[22px] leading-[0.9] tracking-disp">
            {battleStats.total}
          </div>
          <div className="mt-[3px] text-[10.5px] font-bold uppercase leading-[1.15] tracking-[0.03em] text-ink-2">
            Batailles
          </div>
          <div className="mt-[2px] text-[10px] font-bold">
            <span className="text-success">{battleStats.wins} V</span>
            <span className="text-ink-3"> · </span>
            <span className="text-ink-2">{battleStats.draws} N</span>
            <span className="text-ink-3"> · </span>
            <span className="text-fail">{battleStats.losses} D</span>
          </div>
        </Link>
      </section>

      <div className="min-h-[20px] flex-1" />

      {/* ── CTA ── */}
      <Link href="/quiz" className="cta-primary cta-next">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M6 4l14 8-14 8V4z" />
        </svg>
        Lancer une session
      </Link>

      <Link
        href="/jokers"
        className="mt-3 flex h-[52px] items-center justify-center gap-2 border-[3px] border-ink bg-card font-disp text-[15px] uppercase tracking-disp shadow-hard"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" aria-hidden>
          <path d="M8 2h8l6 6v8l-6 6H8l-6-6V8z" />
        </svg>
        Mes Jokers
      </Link>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Link
          href="/themes"
          className="flex h-[52px] items-center justify-center gap-2 border-[3px] border-ink bg-card font-disp text-[15px] uppercase tracking-disp shadow-hard"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
          Thème
        </Link>
        <Link
          href="/difficulte"
          className="flex h-[52px] items-center justify-center gap-2 border-[3px] border-ink bg-card font-disp text-[15px] uppercase tracking-disp shadow-hard"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 20V14M12 20V8M20 20v-9" />
          </svg>
          Difficulté
        </Link>
      </div>

      <Link
        href="/bataille"
        className="relative mt-3 flex h-[52px] items-center justify-center gap-2 border-[3px] border-ink bg-ink text-cream font-disp text-[15px] uppercase tracking-disp shadow-hard-blue"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
        </svg>
        Affronter un Joueur
        {pendingBattles > 0 && (
          <span className="absolute -right-2 -top-2 flex h-6 min-w-[24px] items-center justify-center rounded-full border-2 border-paper bg-fail px-1 font-sans text-[12px] font-bold leading-none text-white">
            {pendingBattles}
          </span>
        )}
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
          href="/stats"
          className="flex h-[52px] items-center justify-center gap-2 border-[3px] border-ink bg-card font-disp text-[15px] uppercase tracking-disp shadow-hard"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 3v18h18" />
            <path d="M7 13l3.5-3.5 3 3L19 6" />
          </svg>
          Mes stats
        </Link>
      </div>

      {user.role === 'admin' && (
        <Link
          href="/admin"
          className="mt-3 flex h-[52px] items-center justify-center gap-2 border-[3px] border-ink bg-[#8E1F12] text-cream font-disp text-[15px] uppercase tracking-disp shadow-hard"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Console admin
        </Link>
      )}

      {totalQuestions === 0 && (
        <p className="mt-3 text-center text-[12px] font-semibold text-brand-deep">
          Aucune question en base — lance une synchro depuis la console admin.
        </p>
      )}

      <div className="mt-4 flex items-center justify-center gap-4 text-[12px] font-semibold text-ink-2">
        <LogoutButton />
      </div>
    </main>
  );
}
