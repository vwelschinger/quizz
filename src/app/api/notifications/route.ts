import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import {
  getNotifications,
  countUnreadNotifications,
  deleteAllNotifications,
} from '@/lib/db/notifications';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ notifications: [], unreadCount: 0 });
  const [notifications, unreadCount] = await Promise.all([
    getNotifications(user.id),
    countUnreadNotifications(user.id),
  ]);
  return NextResponse.json({ notifications, unreadCount });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  await deleteAllNotifications(user.id);
  return NextResponse.json({ ok: true });
}
