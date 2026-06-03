import { query, queryOne } from './pool';

export interface NotificationView {
  id: number;
  kind: string;
  prompt: string | null;
  eloDelta: number;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export function getNotifications(userId: number, limit = 20): Promise<NotificationView[]> {
  return query<NotificationView>(
    `SELECT id, kind, prompt, elo_delta AS "eloDelta", link, read, created_at AS "createdAt"
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit],
  );
}

export async function countUnreadNotifications(userId: number): Promise<number> {
  const row = await queryOne<{ count: number }>(
    'SELECT count(*)::int AS count FROM notifications WHERE user_id = $1 AND read = false',
    [userId],
  );
  return row?.count ?? 0;
}

export async function markNotificationsRead(userId: number, ids: number[]): Promise<void> {
  if (ids.length === 0) {
    await query('UPDATE notifications SET read = true WHERE user_id = $1 AND read = false', [userId]);
  } else {
    await query('UPDATE notifications SET read = true WHERE user_id = $1 AND id = ANY($2::int[])', [
      userId,
      ids,
    ]);
  }
}

export async function deleteNotification(userId: number, id: number): Promise<void> {
  await query('DELETE FROM notifications WHERE user_id = $1 AND id = $2', [userId, id]);
}

export async function deleteAllNotifications(userId: number): Promise<void> {
  await query('DELETE FROM notifications WHERE user_id = $1', [userId]);
}
