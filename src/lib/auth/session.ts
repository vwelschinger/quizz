import { cookies } from 'next/headers';
import {
  createSession,
  deleteSession,
  getSessionUser,
  type SessionUser,
} from '@/lib/db/sessions';
import { touchLastSeen } from '@/lib/db/users';

const COOKIE_NAME = 'quizz_session';

export async function startSession(userId: number): Promise<void> {
  const { token, expiresAt } = await createSession(userId);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) await deleteSession(token);
  store.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const user = await getSessionUser(token);
  // « Dernière activité » : rafraîchie dès qu'un joueur fait une action (throttlée, best-effort).
  if (user) void touchLastSeen(user.id).catch(() => {});
  return user;
}

export type { SessionUser };
