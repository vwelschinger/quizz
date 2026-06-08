import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getBonusBalance, getUserJokers, getJokerPurchaseCounts } from '@/lib/jokers/ledger';
import JokersIntro from '../JokersIntro';
import JokersClient from './JokersClient';

export const dynamic = 'force-dynamic';

export default async function JokersPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [balance, owned, purchases] = await Promise.all([
    getBonusBalance(user.id),
    getUserJokers(user.id),
    getJokerPurchaseCounts(user.id),
  ]);
  const inventory: Record<string, number> = {};
  for (const j of owned) inventory[j.joker_id] = j.qty;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-[18px] pb-[42px] pt-[60px]">
      <div className="mb-4">
        <Link href="/" className="text-[12px] font-semibold text-ink-2 underline">
          ← Tableau de bord
        </Link>
      </div>

      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-deep">
            Portefeuille
          </div>
          <h1 className="font-disp text-[40px] uppercase leading-[0.9] tracking-disp">Jokers</h1>
        </div>
        <JokersIntro withButton />
      </header>

      <JokersClient
        initialBalance={balance}
        initialInventory={inventory}
        initialPurchases={purchases}
      />
    </main>
  );
}
