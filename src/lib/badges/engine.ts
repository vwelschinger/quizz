import { query, queryOne, withTransaction } from '@/lib/db/pool';
import { getDailyStreak, getThemeBreakdown } from '@/lib/db/answers';
import { getPlayerRank } from '@/lib/db/leaderboard';
import { postBonus } from '@/lib/jokers/ledger';
import { BADGE_KOPECKS } from '@/lib/jokers/rewards';
import { BADGES, type BadgeDef, type UserBadgeStats } from './catalog';

function longestRun<T>(rows: T[], pred: (t: T) => boolean): number {
  let best = 0;
  let cur = 0;
  for (const r of rows) {
    if (pred(r)) {
      cur++;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
  }
  return best;
}

/** Construit l'instantané des stats d'un joueur, à comparer aux conditions des badges. */
export async function getUserBadgeStats(userId: number): Promise<UserBadgeStats> {
  const [
    base,
    expert,
    hard,
    days,
    battle,
    vsOpp,
    contest,
    theme,
    timeFlags,
    userRow,
    correctRows,
    battleRows,
    daily,
    themeBreakdown,
    rank,
  ] = await Promise.all([
    queryOne<{ answered: number; correct: number }>(
      'SELECT count(*)::int AS answered, coalesce(sum((is_correct)::int),0)::int AS correct FROM answers WHERE user_id=$1',
      [userId],
    ),
    queryOne<{ n: number }>(
      "SELECT count(*)::int AS n FROM answers a JOIN questions q ON q.id=a.question_id WHERE a.user_id=$1 AND a.is_correct AND q.category='expert'",
      [userId],
    ),
    queryOne<{ n: number }>(
      'SELECT count(*)::int AS n FROM answers a JOIN questions q ON q.id=a.question_id WHERE a.user_id=$1 AND a.is_correct AND q.community_success_rate IS NOT NULL AND q.community_success_rate < 30',
      [userId],
    ),
    queryOne<{ n: number }>(
      "SELECT count(DISTINCT (answered_at AT TIME ZONE 'Europe/Paris')::date)::int AS n FROM answers WHERE user_id=$1",
      [userId],
    ),
    queryOne<{
      played: number;
      won: number;
      lost: number;
      perfect: number;
      beat_higher: boolean | null;
      faced_higher: boolean | null;
    }>(
      `SELECT
         (count(*) FILTER (WHERE status='finished'))::int AS played,
         (count(*) FILTER (WHERE status='finished' AND winner_id=$1))::int AS won,
         (count(*) FILTER (WHERE status='finished' AND winner_id IS NOT NULL AND winner_id<>$1))::int AS lost,
         (count(*) FILTER (WHERE status='finished' AND ((challenger_id=$1 AND challenger_score=jsonb_array_length(question_ids)) OR (opponent_id=$1 AND opponent_score=jsonb_array_length(question_ids)))))::int AS perfect,
         bool_or(status='finished' AND winner_id=$1 AND ((challenger_id=$1 AND opponent_elo_before>challenger_elo_before) OR (opponent_id=$1 AND challenger_elo_before>opponent_elo_before))) AS beat_higher,
         bool_or(status='finished' AND ((challenger_id=$1 AND opponent_elo_before>challenger_elo_before) OR (opponent_id=$1 AND challenger_elo_before>opponent_elo_before))) AS faced_higher
       FROM battles WHERE challenger_id=$1 OR opponent_id=$1`,
      [userId],
    ),
    queryOne<{ max_wins: number; max_losses: number; beat_admin: boolean | null }>(
      `SELECT
         coalesce(max(c) FILTER (WHERE res='win'), 0)::int AS max_wins,
         coalesce(max(c) FILTER (WHERE res='loss'), 0)::int AS max_losses,
         bool_or(res='win' AND is_admin) AS beat_admin
       FROM (
         SELECT CASE WHEN b.challenger_id=$1 THEN b.opponent_id ELSE b.challenger_id END AS opp,
                CASE WHEN b.winner_id=$1 THEN 'win' WHEN b.winner_id IS NOT NULL THEN 'loss' ELSE 'draw' END AS res,
                bool_or(o.role='admin') AS is_admin,
                count(*) AS c
         FROM battles b
         JOIN users o ON o.id = CASE WHEN b.challenger_id=$1 THEN b.opponent_id ELSE b.challenger_id END
         WHERE b.status='finished' AND (b.challenger_id=$1 OR b.opponent_id=$1)
         GROUP BY opp, res
       ) t`,
      [userId],
    ),
    queryOne<{ total: number; accepted: number }>(
      "SELECT count(*)::int AS total, (count(*) FILTER (WHERE status='accepted'))::int AS accepted FROM contestations WHERE user_id=$1",
      [userId],
    ),
    queryOne<{ mastered: boolean | null }>(
      'SELECT EXISTS (SELECT 1 FROM answers a JOIN questions q ON q.id=a.question_id WHERE a.user_id=$1 AND a.is_correct AND q.theme IS NOT NULL GROUP BY q.theme HAVING count(*)>=15) AS mastered',
      [userId],
    ),
    queryOne<{ night: boolean | null; weekend: boolean | null }>(
      `SELECT bool_or(extract(hour FROM (answered_at AT TIME ZONE 'Europe/Paris')) < 5) AS night,
              bool_or(extract(isodow FROM (answered_at AT TIME ZONE 'Europe/Paris')) IN (6,7)) AS weekend
       FROM answers WHERE user_id=$1`,
      [userId],
    ),
    queryOne<{ elo: number }>('SELECT elo FROM users WHERE id=$1', [userId]),
    query<{ is_correct: boolean }>(
      'SELECT is_correct FROM answers WHERE user_id=$1 ORDER BY answered_at ASC',
      [userId],
    ),
    query<{ winner_id: number | null }>(
      "SELECT winner_id FROM battles WHERE status='finished' AND (challenger_id=$1 OR opponent_id=$1) ORDER BY resolved_at ASC",
      [userId],
    ),
    getDailyStreak(userId),
    getThemeBreakdown(userId),
    getPlayerRank(userId),
  ]);

  const answered = base?.answered ?? 0;
  const correct = base?.correct ?? 0;

  return {
    answered,
    correct,
    successRate: answered > 0 ? Math.round((correct / answered) * 100) : 0,
    bestStreak: longestRun(correctRows, (r) => r.is_correct),
    elo: userRow?.elo ?? 0,
    expertCorrect: expert?.n ?? 0,
    hardCorrect: hard?.n ?? 0,
    distinctDays: days?.n ?? 0,
    dailyStreak: daily.days,
    battlesPlayed: battle?.played ?? 0,
    battlesWon: battle?.won ?? 0,
    battleLosses: battle?.lost ?? 0,
    bestBattleStreak: longestRun(battleRows, (r) => r.winner_id === userId),
    perfectBattles: battle?.perfect ?? 0,
    beatHigherElo: battle?.beat_higher ?? false,
    facedHigherElo: battle?.faced_higher ?? false,
    beatAdmin: vsOpp?.beat_admin ?? false,
    maxWinsVsOpponent: vsOpp?.max_wins ?? 0,
    maxLossesVsOpponent: vsOpp?.max_losses ?? 0,
    contestationsAccepted: contest?.accepted ?? 0,
    contestationsTotal: contest?.total ?? 0,
    themeMastered: theme?.mastered ?? false,
    nightOwl: timeFlags?.night ?? false,
    weekendWarrior: timeFlags?.weekend ?? false,
    rank,
    themes: themeBreakdown.map((r) => ({
      theme: r.theme,
      answered: Number(r.answered),
      correct: Number(r.correct),
      successRate: Number(r.successRate),
    })),
  };
}

export async function getOwnedBadgeIds(userId: number): Promise<Set<string>> {
  const rows = await query<{ badge_id: string }>(
    'SELECT badge_id FROM user_badges WHERE user_id=$1',
    [userId],
  );
  return new Set(rows.map((r) => r.badge_id));
}

export async function countUserBadges(userId: number): Promise<number> {
  const row = await queryOne<{ n: number }>(
    'SELECT count(*)::int AS n FROM user_badges WHERE user_id=$1',
    [userId],
  );
  return row?.n ?? 0;
}

/**
 * Évalue les badges non encore obtenus et attribue les nouveaux (idempotent), avec une notification
 * par badge débloqué. Renvoie la liste des badges nouvellement gagnés. Ne lève jamais : en cas
 * d'erreur, renvoie []. À appeler après un évènement (réponse, fin de bataille…), hors transaction.
 */
export async function checkAndAwardBadges(userId: number): Promise<BadgeDef[]> {
  try {
    const [owned, stats] = await Promise.all([getOwnedBadgeIds(userId), getUserBadgeStats(userId)]);
    const newly = BADGES.filter((b) => {
      if (owned.has(b.id)) return false;
      try {
        return b.test(stats);
      } catch {
        return false;
      }
    });
    if (newly.length === 0) return [];

    await withTransaction(async (client) => {
      for (const b of newly) {
        const ins = await client.query(
          'INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING badge_id',
          [userId, b.id],
        );
        if (ins.rowCount !== 1) continue; // déjà possédé (course) → pas de double crédit
        await client.query(
          "INSERT INTO notifications (user_id, kind, prompt, link) VALUES ($1, 'badge_unlocked', $2, '/badges')",
          [userId, `Badge « ${b.name} » débloqué`],
        );
        // Récompense en Kopecks selon le palier du badge.
        await postBonus(client, userId, BADGE_KOPECKS[b.tier], 'badge_grant', { type: 'badge', id: 0 });
      }
    });
    return newly;
  } catch {
    return [];
  }
}

const PODIUM_RECHECK_LIMIT = 5; // petit tampon au-delà du top 3 (re-check idempotent = gratuit)

/**
 * Ré-évalue les badges des joueurs actuellement en tête du classement. Capte ceux poussés sur le
 * podium par l'évolution d'un AUTRE joueur (chute d'un mieux classé, ajustement ELO admin…), sans
 * qu'ils aient eux-mêmes joué. Idempotent et bon marché (top 5). Best-effort : ne lève jamais.
 * Tri identique à `getLeaderboard` / `getPlayerRank` (ELO ↓, réponses ↓, pseudo ↑, admins exclus).
 */
export async function recheckPodiumBadges(): Promise<void> {
  try {
    const rows = await query<{ id: number }>(
      `SELECT u.id
       FROM users u
       LEFT JOIN answers a ON a.user_id = u.id
       WHERE u.role = 'user'
       GROUP BY u.id
       ORDER BY u.elo DESC, count(a.id) DESC, u.username ASC
       LIMIT $1`,
      [PODIUM_RECHECK_LIMIT],
    );
    await Promise.all(rows.map((r) => checkAndAwardBadges(Number(r.id))));
  } catch {
    /* idempotent, best-effort — sera rattrapé à la prochaine action */
  }
}
