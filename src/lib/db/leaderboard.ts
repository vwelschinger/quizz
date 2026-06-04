import { query, queryOne } from './pool';

export interface LeaderboardEntry {
  id: number;
  username: string;
  elo: number;
  answered: number;
  successRate: number; // %
  badges: number; // nombre de badges débloqués
}

/** Classement des joueurs (role user) par ELO décroissant, avec volume, % de réussite et badges. */
export function getLeaderboard(limit = 100): Promise<LeaderboardEntry[]> {
  return boardForRole('user', limit);
}

/** Comptes admin : affichés « hors classement » en bas du classement. */
export function getAdminBoard(limit = 100): Promise<LeaderboardEntry[]> {
  return boardForRole('admin', limit);
}

function boardForRole(role: 'user' | 'admin', limit: number): Promise<LeaderboardEntry[]> {
  return query<LeaderboardEntry>(
    `SELECT u.id,
            u.username,
            u.elo,
            count(a.id)::int AS answered,
            coalesce(round(avg(CASE WHEN a.is_correct THEN 100.0 ELSE 0 END)), 0)::int AS "successRate",
            (SELECT count(*) FROM user_badges ub WHERE ub.user_id = u.id)::int AS badges
     FROM users u
     LEFT JOIN answers a ON a.user_id = u.id
     WHERE u.role = $2
     GROUP BY u.id
     ORDER BY u.elo DESC, answered DESC, u.username ASC
     LIMIT $1`,
    [limit, role],
  );
}

/** Rang du joueur (par ELO) parmi les joueurs (role user) + total de joueurs. */
export async function getUserRank(userElo: number): Promise<{ rank: number; total: number }> {
  const row = await queryOne<{ rank: number; total: number }>(
    `SELECT
       (SELECT count(*)::int FROM users WHERE role = 'user' AND elo > $1) + 1 AS rank,
       (SELECT count(*)::int FROM users WHERE role = 'user') AS total`,
    [userElo],
  );
  return { rank: row?.rank ?? 1, total: row?.total ?? 0 };
}
