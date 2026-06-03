import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/guards';
import {
  getLtdsTokenStatus,
  getLtdsBaseUrl,
  setLtdsToken,
  setLtdsBaseUrl,
} from '@/lib/ltds/sync';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  return NextResponse.json({
    status: await getLtdsTokenStatus(),
    baseUrl: await getLtdsBaseUrl(),
  });
}

const schema = z.object({
  token: z.string().min(10).optional(),
  baseUrl: z.string().url().optional(),
});

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }

  if (parsed.data.token) await setLtdsToken(parsed.data.token);
  if (parsed.data.baseUrl) await setLtdsBaseUrl(parsed.data.baseUrl);

  return NextResponse.json({
    status: await getLtdsTokenStatus(),
    baseUrl: await getLtdsBaseUrl(),
  });
}
