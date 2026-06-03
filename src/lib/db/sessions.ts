import { randomBytes } from 'node:crypto';
import { query, queryOne } from './pool';
import type { Role } from './types';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

export interface SessionUser {
  id: number;
  username: string;
  role: Role;
  elo: number;
}

export async function createSession(userId: number): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await query('INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)', [
    token,
    userId,
    expiresAt,
  ]);
  return { token, expiresAt };
}

export function getSessionUser(token: string): Promise<SessionUser | null> {
  return queryOne<SessionUser>(
    `SELECT u.id, u.username, u.role, u.elo
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > now()`,
    [token],
  );
}

export async function deleteSession(token: string): Promise<void> {
  await query('DELETE FROM sessions WHERE token = $1', [token]);
}
