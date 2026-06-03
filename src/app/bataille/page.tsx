import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import {
  listBattlesForUser,
  listAllBattles,
  type BattleSummary,
  type AdminBattleRow,
} from '@/lib/db/battles';
import { listOpponents } from '@/lib/db/users';
import CreateBattleForm from './CreateBattleForm';
import LocalTime from '../LocalTime';

export const dynamic = 'force-dynamic';

function fmtDelta(d: number | null): string {
  if (d == null) return '—';
  return d >= 0 ? `+${d}` : `${d}`;
}

function BattleItem({ b }: { b: BattleSummary }) {
  const toPlay = b.status === 'waiting' && !b.myPlayed;
  const inner = (
    <div
      className={`flex items-center justify-between gap-3 border-[3px] border-ink p-3 ${
        toPlay ? 'bg-ink text-cream shadow-hard-blue' : 'bg-card shadow-hard'
      }`}
    >
      <div className="min-w-0">
        <div className="truncate font-disp text-[18px] uppercase leading-none tracking-disp">
          vs {b.opponentName}
        </div>
        <div
          className={`mt-1 text-[11px] font-semibold uppercase tracking-[0.04em] ${
            toPlay ? 'text-ink-3' : 'text-ink-2'
          }`}
        >
          {b.status === 'finished'
            ? `${b.outcome === 'win' ? 'Victoire' : b.outcome === 'loss' ? 'Défaite' : 'Nul'} · ${b.myScore}–${b.opponentScore} · ELO ${fmtDelta(b.eloDelta)}`
            : toPlay
              ? `À toi de jouer · ${b.total} questions`
              : b.opponentPlayed
                ? 'Résolution…'
                : "En attente de l'adversaire"}
        </div>
        <div className={`mt-1 text-[10px] font-medium ${toPlay ? 'text-cream/70' : 'text-ink-3'}`}>
          <LocalTime iso={b.createdAt} />
        </div>
      </div>
      {toPlay && <span className="shrink-0 font-disp text-[14px] uppercase tracking-disp">Jouer →</span>}
    </div>
  );
  return toPlay || b.status === 'finished' ? <Link href={`/bataille/${b.id}`}>{inner}</Link> : inner;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-2">{title}</h2>
      <div className="flex flex-col gap-[10px]">{children}</div>
    </section>
  );
}

// Vue admin : une bataille du jeu (lecture seule, tous joueurs confondus).
function AdminBattleItem({ b }: { b: AdminBattleRow }) {
  return (
    <div className="border-[3px] border-ink bg-card p-3 shadow-hard">
      <div className="truncate font-disp text-[16px] uppercase leading-none tracking-disp">
        {b.challengerName} <span className="text-ink-3">vs</span> {b.opponentName}
      </div>
      <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-2">
        {b.status === 'finished'
          ? `${b.challengerScore}–${b.opponentScore} · ${b.winnerName ? `Vainqueur ${b.winnerName}` : 'Match nul'}`
          : 'En cours'}
      </div>
      <div className="mt-1 text-[10px] font-medium text-ink-3">
        <LocalTime iso={b.createdAt} />
      </div>
    </div>
  );
}

export default async function BattlePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const battles = await listBattlesForUser(user.id);
  const opponents = await listOpponents(user.id);
  const toPlay = battles.filter((b) => b.status === 'waiting' && !b.myPlayed);
  const waiting = battles.filter((b) => b.status === 'waiting' && b.myPlayed);
  const finished = battles.filter((b) => b.status === 'finished');
  const allBattles = user.role === 'admin' ? await listAllBattles() : [];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-[18px] pb-[42px] pt-[60px]">
      <div className="mb-4">
        <Link href="/" className="text-[12px] font-semibold text-ink-2 underline">
          ← Tableau de bord
        </Link>
      </div>
      <header className="mb-5">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-deep">Duel</div>
        <h1 className="font-disp text-[40px] uppercase leading-[0.9] tracking-disp">Bataille</h1>
      </header>

      <CreateBattleForm opponents={opponents} />

      {toPlay.length > 0 && (
        <Section title={`À toi de jouer · ${toPlay.length}`}>
          {toPlay.map((b) => (
            <BattleItem key={b.id} b={b} />
          ))}
        </Section>
      )}
      {waiting.length > 0 && (
        <Section title={`En attente · ${waiting.length}`}>
          {waiting.map((b) => (
            <BattleItem key={b.id} b={b} />
          ))}
        </Section>
      )}
      {finished.length > 0 && (
        <Section title={`Terminées · ${finished.length}`}>
          {finished.map((b) => (
            <BattleItem key={b.id} b={b} />
          ))}
        </Section>
      )}
      {battles.length === 0 && (
        <p className="mt-6 text-center text-[13px] text-ink-2">
          Aucune bataille. Défie un joueur par son pseudo ci-dessus.
        </p>
      )}

      {user.role === 'admin' && allBattles.length > 0 && (
        <Section title={`Toutes les batailles · ${allBattles.length}`}>
          {allBattles.map((b) => (
            <AdminBattleItem key={b.id} b={b} />
          ))}
        </Section>
      )}
    </main>
  );
}
