import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getUnreadNotifications } from '@/lib/db/notifications';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ notifications: [] });
  return NextResponse.json({ notifications: await getUnreadNotifications(user.id) });
}
