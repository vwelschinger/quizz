import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guards';
import ConnexionsAdmin from './ConnexionsAdmin';

export const dynamic = 'force-dynamic';

export default async function AdminConnexionsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect('/');
  return (
    <div className="min-h-dvh bg-admin-bg">
      <ConnexionsAdmin />
    </div>
  );
}
