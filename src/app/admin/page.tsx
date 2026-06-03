import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guards';
import AdminConsole from './AdminConsole';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) redirect('/');
  return (
    <div className="min-h-dvh bg-admin-bg">
      <AdminConsole />
    </div>
  );
}
