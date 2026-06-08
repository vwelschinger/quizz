import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guards';
import AchatsAdmin from './AchatsAdmin';

export const dynamic = 'force-dynamic';

export default async function AdminAchatsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect('/');
  return (
    <div className="min-h-dvh bg-admin-bg">
      <AchatsAdmin />
    </div>
  );
}
