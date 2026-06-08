import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guards';
import SynchroAdmin from './SynchroAdmin';

export const dynamic = 'force-dynamic';

export default async function AdminSynchroPage() {
  const admin = await requireAdmin();
  if (!admin) redirect('/');
  return (
    <div className="min-h-dvh bg-admin-bg">
      <SynchroAdmin />
    </div>
  );
}
