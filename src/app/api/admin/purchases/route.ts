import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { listRecentJokerPurchases } from '@/lib/jokers/ledger';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  return NextResponse.json({ purchases: await listRecentJokerPurchases(80) });
}
