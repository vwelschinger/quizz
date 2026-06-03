import { query } from './pool';

export interface NotificationView {
  id: number;
  kind: string;
  prompt: string | null;
  eloDelta: number;
  link: string | null;
}

export function getUnreadNotifications(userId: number): Promise<NotificationView[]> {
  return query<NotificationView>(
    `SELECT id, kind, prompt, elo_delta AS "eloDelta", link
     FROM notifications
     WHERE user_id = $1 AND read = false
     ORDER BY created_at DESC
     LIMIT 20`,
    [userId],
  );
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
