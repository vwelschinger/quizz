import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getOwnedBadgeIds } from '@/lib/badges/engine';
import { BADGES, BADGE_FAMILIES, type BadgeDef } from '@/lib/badges/catalog';
import { MULTI_THEME_BADGES, THEME_BADGE_GROUPS } from '@/lib/badges/themeBadges';

export const dynamic = 'force-dynamic';

function BadgeCell({ b, has }: { b: BadgeDef; has: boolean }) {
  return (
    <div className="flex flex-col items-center text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/badge-icons/${b.id}.svg`}
        alt={b.name}
        width={66}
        height={66}
        className={has ? '' : 'opacity-25 grayscale'}
      />
      <div className={`mt-1 text-[10px] font-bold uppercase leading-tight ${has ? 'text-ink' : 'text-ink-3'}`}>
        {b.name}
      </div>
      <div className="mt-[2px] text-[9px] leading-tight text-ink-3">{b.description}</div>
    </div>
  );
}

function BadgeGrid({ list, owned }: { list: BadgeDef[]; owned: Set<string> }) {
  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-4">
      {list.map((b) => (
        <BadgeCell key={b.id} b={b} has={owned.has(b.id)} />
      ))}
    </div>
  );
}

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
        // La famille « Thème » est sous-groupée (multi-thèmes + un bloc par thème) car les noms
        // « fun » ne contiennent plus le thème.
        if (fam === 'Thème') {
          return (
            <section key={fam} className="mt-6">
              <h2 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-2">
                {fam}
              </h2>

              <h3 className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-3">
                Polyvalence
              </h3>
              <BadgeGrid list={MULTI_THEME_BADGES} owned={owned} />

              {THEME_BADGE_GROUPS.map((g) => (
                <div key={g.slug} className="mt-5">
                  <h3 className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-3">
                    {g.theme}
                  </h3>
                  <BadgeGrid list={g.badges} owned={owned} />
                </div>
              ))}
            </section>
          );
        }

        const list = BADGES.filter((b) => b.family === fam);
        return (
          <section key={fam} className="mt-6">
            <h2 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-2">
              {fam}
            </h2>
            <BadgeGrid list={list} owned={owned} />
          </section>
        );
      })}
    </main>
  );
}
