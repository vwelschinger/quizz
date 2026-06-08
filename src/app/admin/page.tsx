import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guards';
import { countPendingContestations } from '@/lib/db/contestations';
import { listUsers, countLoginEvents } from '@/lib/db/users';
import { countJokerPurchases } from '@/lib/jokers/ledger';
import { getLtdsTokenStatus } from '@/lib/ltds/sync';
import AdminMenu from './AdminMenu';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) redirect('/');

  const [pending, users, logins, purchases, token] = await Promise.all([
    countPendingContestations(),
    listUsers(),
    countLoginEvents(),
    countJokerPurchases(),
    getLtdsTokenStatus(),
  ]);

  return (
    <div className="min-h-dvh bg-admin-bg">
      <main className="mx-auto w-full max-w-[640px] px-[18px] pb-[42px] pt-[60px] text-cream">
        <header className="adm-head">
          <div>
            <div className="adm-eyebrow">CONSOLE — RVR</div>
            <div className="adm-title">ADMINISTRATION</div>
          </div>
          <span className="adm-env">PROD</span>
        </header>

        <AdminMenu
          pending={pending}
          users={users.length}
          logins={logins}
          purchases={purchases}
          tokenActive={token.active}
        />

        <div className="mt-6 text-center">
          <Link href="/" className="text-[12px] font-semibold text-ink-3 underline">
            ← Tableau de bord
          </Link>
        </div>
      </main>
    </div>
  );
}
