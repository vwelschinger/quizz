import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guards';
import JoueursAdmin from './JoueursAdmin';

export const dynamic = 'force-dynamic';

export default async function AdminJoueursPage() {
  const admin = await requireAdmin();
  if (!admin) redirect('/');
  return (
    <div className="min-h-dvh bg-admin-bg">
      <JoueursAdmin />
    </div>
  );
}
