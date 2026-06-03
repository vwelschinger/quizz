import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getOwnedBadgeIds } from '@/lib/badges/engine';
import { BADGES, BADGE_FAMILIES } from '@/lib/badges/catalog';

export const dynamic = 'force-dynamic';

export default async function BadgesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const owned = await getOwnedBadgeIds(user.id);
  const total = BADGES.length;
  const unlocked = BADGES.filter((b) => owned.has(b.id)).length;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-[18px] pb-[42px] pt-[60px]">
      <div className="mb-4">
        <Link href="/" className="text-[12px] font-semibold text-ink-2 underline">
          ← Tableau de bord
        </Link>
      </div>
      <header className="mb-4">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-deep">
          Récompenses
        </div>
        <h1 className="font-disp text-[40px] uppercase leading-[0.9] tracking-disp">Badges</h1>
        <div className="mt-3 inline-block border-[3px] border-ink bg-card px-3 py-1 font-disp text-[16px] tracking-disp shadow-hard">
          {unlocked} / {total} débloqués
        </div>
      </header>

      {BADGE_FAMILIES.map((fam) => {
        const list = BADGES.filter((b) => b.family === fam);
        return (
          <section key={fam} className="mt-6">
            <h2 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-2">
              {fam}
            </h2>
            <div className="grid grid-cols-3 gap-x-3 gap-y-4">
              {list.map((b) => {
                const has = owned.has(b.id);
                return (
                  <div key={b.id} className="flex flex-col items-center text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/badge-icons/${b.id}.svg`}
                      alt={b.name}
                      width={66}
                      height={66}
                      className={has ? '' : 'opacity-25 grayscale'}
                    />
                    <div
                      className={`mt-1 text-[10px] font-bold uppercase leading-tight ${has ? 'text-ink' : 'text-ink-3'}`}
                    >
                      {b.name}
                    </div>
                    <div className="mt-[2px] text-[9px] leading-tight text-ink-3">
                      {b.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </main>
  );
}
