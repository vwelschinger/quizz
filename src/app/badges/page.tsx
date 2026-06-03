import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function BadgesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-[18px] pb-[42px] pt-[60px]">
      <div className="mb-4">
        <Link href="/" className="text-[12px] font-semibold text-ink-2 underline">
          ← Tableau de bord
        </Link>
      </div>
      <header className="mb-5">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-deep">
          Récompenses
        </div>
        <h1 className="font-disp text-[40px] uppercase leading-[0.9] tracking-disp">Badges</h1>
      </header>

      <section className="mt-2">
        <h2 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-2">
          Débloqués
        </h2>
        <div className="card-hard p-6 text-center text-[13px] text-ink-2">
          Aucun badge débloqué pour l’instant.
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-2">
          À débloquer
        </h2>
        <div className="card-hard p-6 text-center text-[13px] text-ink-2">
          La liste des badges à débloquer arrive bientôt. 🏅
        </div>
      </section>
    </main>
  );
}
