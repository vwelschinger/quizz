import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getBattleView } from '@/lib/db/battles';
import BattlePlay from './BattlePlay';

export const dynamic = 'force-dynamic';

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-[18px] pb-[42px] pt-[60px]">
      <div className="mb-4">
        <Link href="/bataille" className="text-[12px] font-semibold text-ink-2 underline">
          ← Batailles
        </Link>
      </div>
      {children}
    </main>
  );
}

export default async function BattleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { id } = await params;
  const view = await getBattleView(Number(id), user.id);

  if (view.state === 'notfound' || view.state === 'forbidden') {
    return (
      <Frame>
        <div className="card-hard p-6 text-center">
          <p className="font-semibold">
            {view.state === 'notfound' ? 'Bataille introuvable.' : 'Accès refusé.'}
          </p>
        </div>
      </Frame>
    );
  }

  if (view.state === 'play') {
    return (
      <BattlePlay battleId={view.battleId} opponentName={view.opponentName} questions={view.questions} />
    );
  }

  if (view.state === 'waiting') {
    return (
      <Frame>
        <div className="card-hard p-6 text-center">
          <div className="font-disp text-[28px] uppercase tracking-disp">En attente</div>
          <p className="mt-2 text-[14px] text-ink-2">
            Tu as joué ({view.myScore}/{view.total}). En attente de <b>{view.opponentName}</b>.
          </p>
        </div>
      </Frame>
    );
  }

  const win = view.outcome === 'win';
  const draw = view.outcome === 'draw';
  return (
    <Frame>
      <div className="card-hard p-6 text-center">
        <div
          className={`font-disp text-[34px] uppercase tracking-disp ${win ? 'text-success' : draw ? 'text-ink' : 'text-fail'}`}
        >
          {win ? 'Victoire' : draw ? 'Match nul' : 'Défaite'}
        </div>
        <div className="mt-3 font-disp text-[44px] leading-none tracking-disp">
          {view.myScore} – {view.opponentScore}
        </div>
        <div className="mt-1 text-[12px] font-semibold uppercase tracking-[0.04em] text-ink-2">
          vs {view.opponentName}
        </div>
        <div
          className={`mt-4 inline-block border-[3px] border-ink px-4 py-2 font-disp text-[22px] tracking-disp ${view.eloDelta >= 0 ? 'text-success' : 'text-fail'}`}
        >
          ELO {view.eloDelta >= 0 ? `+${view.eloDelta}` : view.eloDelta}
        </div>
      </div>
      <Link href="/bataille" className="cta-primary mt-5">
        Retour aux batailles
      </Link>
    </Frame>
  );
}
