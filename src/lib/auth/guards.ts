import { getCurrentUser } from './session';
import type { SessionUser } from '@/lib/db/sessions';

/** Renvoie l'utilisateur courant, ou null si non connecté. */
export function requireUser(): Promise<SessionUser | null> {
  return getCurrentUser();
}

/** Renvoie l'utilisateur courant s'il est admin, sinon null. */
export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return null;
  return user;
}
