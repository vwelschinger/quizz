import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guards';
import ContestationsAdmin from './ContestationsAdmin';

export const dynamic = 'force-dynamic';

export default async function AdminContestationsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect('/');
  return (
    <div className="min-h-dvh bg-admin-bg">
      <ContestationsAdmin />
    </div>
  );
}
