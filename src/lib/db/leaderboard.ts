import { query } from './pool';

export interface LeaderboardEntry {
  id: number;
  username: string;
  elo: number;
  answered: number;
  successRate: number; // %
}

/** Classement des joueurs (role user) par ELO décroissant, avec volume et % de réussite. */
export function getLeaderboard(limit = 100): Promise<LeaderboardEntry[]> {
  return query<LeaderboardEntry>(
    `SELECT u.id,
            u.username,
            u.elo,
            count(a.id)::int AS answered,
            coalesce(round(avg(CASE WHEN a.is_correct THEN 100.0 ELSE 0 END)), 0)::int AS "successRate"
     FROM users u
     LEFT JOIN answers a ON a.user_id = u.id
     WHERE u.role = 'user'
     GROUP BY u.id
     ORDER BY u.elo DESC, answered DESC, u.username ASC
     LIMIT $1`,
    [limit],
  );
}
