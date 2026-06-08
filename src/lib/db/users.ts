import { query, queryOne } from './pool';
import type { Role, UserRow } from './types';
import { QUIZ_CONFIG } from '@/lib/quiz/config';

export function findUserByUsername(username: string): Promise<UserRow | null> {
  return queryOne<UserRow>('SELECT * FROM users WHERE username = $1', [username]);
}

export function findUserById(id: number): Promise<UserRow | null> {
  return queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
}

export type UserSummary = Pick<UserRow, 'id' | 'username' | 'role' | 'elo' | 'created_at'>;

export function listUsers(): Promise<UserSummary[]> {
  return query<UserSummary>(
    'SELECT id, username, role, elo, created_at FROM users ORDER BY created_at DESC',
  );
}

/** Adversaires possibles (tous les comptes hors soi-même, admins inclus) pour le mode bataille. */
export function listOpponents(excludeUserId: number): Promise<{ id: number; username: string }[]> {
  return query<{ id: number; username: string }>(
    'SELECT id, username FROM users WHERE id <> $1 ORDER BY username ASC',
    [excludeUserId],
  );
}

export function createUser(
  username: string,
  passwordHash: string,
  role: Role = 'user',
): Promise<UserRow | null> {
  return queryOne<UserRow>(
    'INSERT INTO users (username, password_hash, role, elo) VALUES ($1, $2, $3, $4) RETURNING *',
    [username, passwordHash, role, QUIZ_CONFIG.startingPlayerElo],
  );
}

export async function deleteUser(id: number): Promise<void> {
  await query('DELETE FROM users WHERE id = $1', [id]);
}

/** Fixe manuellement l'ELO d'un utilisateur (console admin). */
export async function updateUserElo(id: number, elo: number): Promise<void> {
  await query('UPDATE users SET elo = $1 WHERE id = $2', [elo, id]);
}

/** A-t-il déjà vu la popup d'intro des jokers ? (drapeau persistant, multi-appareils). */
export async function hasSeenJokersIntro(id: number): Promise<boolean> {
  const row = await queryOne<{ seen_jokers_intro: boolean }>(
    'SELECT seen_jokers_intro FROM users WHERE id = $1',
    [id],
  );
  return row?.seen_jokers_intro ?? false;
}

export interface AdminUserRow {
  id: number;
  username: string;
  role: Role;
  elo: number;
  kopecks: number;
  loginCount: number;
  lastLogin: string | null;
  lastSeen: string | null;
  createdAt: string;
}

/** Liste des utilisateurs pour la page d'admin : + solde de Kopecks (ledger) + suivi connexions/activité. */
export async function listUsersDetailed(): Promise<AdminUserRow[]> {
  const rows = await query<{
    id: number;
    username: string;
    role: Role;
    elo: number;
    kopecks: string;
    login_count: string;
    last_login: Date | null;
    last_seen_at: Date | null;
    created_at: Date;
  }>(
    `SELECT u.id, u.username, u.role, u.elo,
            COALESCE(bl.kopecks, 0) AS kopecks,
            COALESCE(le.login_count, 0) AS login_count,
            le.last_login,
            u.last_seen_at,
            u.created_at
       FROM users u
       LEFT JOIN (SELECT user_id, SUM(delta) AS kopecks FROM bonus_ledger GROUP BY user_id) bl
              ON bl.user_id = u.id
       LEFT JOIN (SELECT user_id, COUNT(*) AS login_count, MAX(created_at) AS last_login
                    FROM login_events GROUP BY user_id) le
              ON le.user_id = u.id
      ORDER BY u.created_at DESC`,
  );
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    role: r.role,
    elo: r.elo,
    kopecks: Number(r.kopecks),
    loginCount: Number(r.login_count),
    lastLogin: r.last_login ? r.last_login.toISOString() : null,
    lastSeen: r.last_seen_at ? r.last_seen_at.toISOString() : null,
    createdAt: r.created_at.toISOString(),
  }));
}

/** Met à jour « dernière activité » (throttlée à 2 min pour éviter une écriture par requête). */
export async function touchLastSeen(id: number): Promise<void> {
  await query(
    "UPDATE users SET last_seen_at = now() WHERE id = $1 AND (last_seen_at IS NULL OR last_seen_at < now() - interval '2 minutes')",
    [id],
  );
}

/** Nombre total de connexions enregistrées. */
export async function countLoginEvents(): Promise<number> {
  const row = await queryOne<{ n: number }>('SELECT count(*)::int AS n FROM login_events');
  return row?.n ?? 0;
}

/** Enregistre une connexion (appelé après une authentification réussie). Best-effort. */
export async function recordLogin(userId: number, ip: string | null, userAgent: string | null): Promise<void> {
  await query('INSERT INTO login_events (user_id, ip, user_agent) VALUES ($1, $2, $3)', [
    userId,
    ip,
    userAgent,
  ]);
}

export interface LoginEventRow {
  id: number;
  username: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

/** Connexions récentes (toutes confondues) pour la page d'admin. */
export async function listRecentLogins(limit = 50): Promise<LoginEventRow[]> {
  const rows = await query<{
    id: number;
    username: string;
    ip: string | null;
    user_agent: string | null;
    created_at: Date;
  }>(
    `SELECT le.id, u.username, le.ip, le.user_agent, le.created_at
       FROM login_events le
       JOIN users u ON u.id = le.user_id
      ORDER BY le.created_at DESC
      LIMIT $1`,
    [limit],
  );
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    ip: r.ip,
    userAgent: r.user_agent,
    createdAt: r.created_at.toISOString(),
  }));
}
