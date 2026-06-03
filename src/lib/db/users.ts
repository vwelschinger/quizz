import { query, queryOne } from './pool';
import type { Role, UserRow } from './types';

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

export function createUser(
  username: string,
  passwordHash: string,
  role: Role = 'user',
): Promise<UserRow | null> {
  return queryOne<UserRow>(
    'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING *',
    [username, passwordHash, role],
  );
}

export async function deleteUser(id: number): Promise<void> {
  await query('DELETE FROM users WHERE id = $1', [id]);
}
