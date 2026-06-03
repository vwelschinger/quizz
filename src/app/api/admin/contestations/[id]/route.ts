import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/guards';
import { resolveContestation } from '@/lib/db/contestations';

const schema = z.object({ accept: z.boolean() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const { id } = await params;
  const contestationId = Number(id);
  if (!Number.isInteger(contestationId)) {
    return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });

  const ok = await resolveContestation(contestationId, parsed.data.accept, admin.id);
  if (!ok) {
    return NextResponse.json({ error: 'Contestation introuvable ou déjà traitée' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
