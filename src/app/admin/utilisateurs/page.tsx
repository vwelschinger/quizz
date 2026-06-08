import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guards';
import UsersAdmin from './UsersAdmin';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  if (!admin) redirect('/');
  return (
    <div className="min-h-dvh bg-admin-bg">
      <UsersAdmin />
    </div>
  );
}
