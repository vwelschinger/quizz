import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { runSync, getSyncState } from '@/lib/ltds/sync';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  return NextResponse.json({ state: await getSyncState() });
}

export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  const state = await runSync();
  return NextResponse.json({ state });
}
