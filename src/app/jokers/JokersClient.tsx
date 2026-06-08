'use client';

import { useState } from 'react';
import {
  JOKERS,
  JOKER_CATEGORIES,
  JOKER_CONSTANTS,
  jokerPrice,
  nextJokerPrice,
  getJoker,
  type JokerDef,
} from '@/lib/jokers/catalog';

type Inv = Record<string, number>;

const OCTAGON = 'polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)';
const SCOPE_LABEL: Record<string, string> = { solo: 'Solo', battle: 'Bataille' };

function JokerIcon({ id, size = 44 }: { id: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center border-[2px] border-ink bg-paper"
      style={{ width: size, height: size, clipPath: OCTAGON }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/jokers/${id}.svg`} alt="" width={size - 12} height={size - 12} />
    </span>
  );
}

export default function JokersClient({
  initialBalance,
  initialInventory,
  initialPurchases,
}: {
  initialBalance: number;
  initialInventory: Inv;
  initialPurchases: Inv;
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [inv, setInv] = useState<Inv>(initialInventory);
  const [purchases, setPurchases] = useState<Inv>(initialPurchases);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function post(url: string, body: unknown, key: string) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Action impossible');
        return;
      }
      if (typeof data.balance === 'number') setBalance(data.balance);
      if (Array.isArray(data.jokers)) {
        const m: Inv = {};
        for (const j of data.jokers as { joker_id: string; qty: number }[]) m[j.joker_id] = j.qty;
        setInv(m);
      }
      if (data.purchases && typeof data.purchases === 'object') {
        setPurchases(data.purchases as Inv);
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setBusy(null);
    }
  }

  const buy = (id: string) => post('/api/jokers/buy', { jokerId: id }, `buy:${id}`);
  const balle = () => post('/api/jokers/convert', { type: 'balle' }, 'balle');
  const recycle = (id: string) => post('/api/jokers/convert', { type: 'recyclage', jokerId: id }, `rec:${id}`);

  const consumables = JOKERS.filter((j) => j.kind === 'consumable');
  const ownedConsumables = consumables.filter((j) => (inv[j.id] ?? 0) > 0);

  function ConsumableCard({ def }: { def: JokerDef }) {
    const bought = purchases[def.id] ?? 0;
    const price = nextJokerPrice(jokerPrice(def)!, bought);
    const qty = inv[def.id] ?? 0;
    const key = `buy:${def.id}`;
    return (
      <div className="flex gap-3 border-[3px] border-ink bg-card p-3 shadow-hard">
        <JokerIcon id={def.id} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <div className="font-disp text-[16px] uppercase leading-none tracking-disp">{def.name}</div>
            <div className="shrink-0 text-[11px] font-bold uppercase text-ink-3">{SCOPE_LABEL[def.scope]}</div>
          </div>
          <p className="mt-1 text-[11.5px] leading-snug text-ink-2">{def.description}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="font-disp text-[15px] tracking-disp">
              {price.toLocaleString('fr-FR')}
              <span className="ml-1 text-[10px] font-bold uppercase text-ink-3">Kopecks</span>
              {bought > 0 && <span className="ml-1 text-[10px] font-bold uppercase text-ink-3">(+30%/achat)</span>}
              {qty > 0 && <span className="ml-2 text-[11px] font-bold text-brand-deep">×{qty} en stock</span>}
            </span>
            <button
              type="button"
              disabled={balance < price || busy === key}
              onClick={() => buy(def.id)}
              className="border-[2px] border-ink bg-ink px-3 py-[6px] font-disp text-[13px] uppercase tracking-disp text-cream shadow-hard-blue disabled:opacity-40"
            >
              {busy === key ? '…' : 'Acheter'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Solde dépensable */}
      <div className="mb-5 flex items-center gap-3 border-[3px] border-ink bg-elo-grad px-4 py-3 text-cream shadow-hard-lg">
        <span
          aria-hidden
          className="flex h-9 w-9 items-center justify-center bg-cream font-disp text-[16px] text-ink"
          style={{ clipPath: OCTAGON }}
        >
          ★
        </span>
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-[0.16em]">Kopecks</div>
          <div className="font-disp text-[34px] leading-none tracking-disp">
            {balance.toLocaleString('fr-FR')}
          </div>
        </div>
      </div>

      {/* Explication du fonctionnement des jokers */}
      <div className="mb-5 border-[3px] border-ink bg-card p-3 shadow-hard">
        <h2 className="font-disp text-[15px] uppercase tracking-disp">Comment ça marche</h2>
        <p className="mt-2 text-[12px] leading-snug text-ink-2">
          Tes bonnes réponses te rapportent des <b>Kopecks</b>. Dépense-les ici pour acheter des{' '}
          <b>jokers</b>, garde-les en réserve, puis <b>active-les en pleine partie</b> :
        </p>
        <ul className="mt-2 space-y-1 text-[12px] leading-snug text-ink-2">
          <li>
            • <b className="text-fail">Offensifs</b> (Caféine, Dopage) : multiplient ta variation d’ELO —
            gain <i>et</i> perte. À sortir quand tu es sûr de toi.
          </li>
          <li>
            • <b>Défensifs</b> (Gilet, Esquive, Seconde chance) : annulent une perte, passent une question,
            ou t’offrent un 2e essai si tu te trompes.
          </li>
          <li>
            • <b className="text-brand-deep">Utilitaires</b> (Balle dans le pied, Recyclage) :
            convertissent ELO ↔ Kopecks, ou recyclent un joker en trop.
          </li>
        </ul>
        <p className="mt-2 text-[11px] font-semibold leading-snug text-ink-3">
          Un seul joker par question. Le prix d’un joker augmente de 30 % à chacun de tes achats.
        </p>
      </div>

      {error && (
        <div className="mb-4 border-[2px] border-fail bg-card px-3 py-2 text-[12px] font-bold text-fail">
          {error}
        </div>
      )}

      {/* Catalogue par catégorie */}
      {JOKER_CATEGORIES.map((cat) => {
        const list = consumables.filter((j) => j.category === cat.id);
        if (list.length === 0) return null;
        return (
          <section key={cat.id} className="mb-6">
            <h2 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-2">
              {cat.label}
            </h2>
            <div className="space-y-3">
              {list.map((def) => (
                <ConsumableCard key={def.id} def={def} />
              ))}
            </div>
          </section>
        );
      })}

      {/* Conversions */}
      <section className="mb-6">
        <h2 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-2">
          Conversions
        </h2>

        <div className="mb-3 flex gap-3 border-[3px] border-ink bg-card p-3 shadow-hard">
          <JokerIcon id="balle-dans-le-pied" />
          <div className="min-w-0 flex-1">
            <div className="font-disp text-[16px] uppercase leading-none tracking-disp">
              Balle dans le pied
            </div>
            <p className="mt-1 text-[11.5px] leading-snug text-ink-2">
              −{JOKER_CONSTANTS.BALLE_ELO_COST} ELO contre +
              {JOKER_CONSTANTS.BALLE_BONUS_GAIN.toLocaleString('fr-FR')} Kopecks. Répétable, refusée sous{' '}
              {JOKER_CONSTANTS.BALLE_ELO_FLOOR} ELO.
            </p>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                disabled={busy === 'balle'}
                onClick={balle}
                className="border-[2px] border-ink bg-card px-3 py-[6px] font-disp text-[13px] uppercase tracking-disp shadow-hard disabled:opacity-40"
              >
                {busy === 'balle' ? '…' : 'Convertir'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-[3px] border-ink bg-card p-3 shadow-hard">
          <JokerIcon id="recyclage" />
          <div className="min-w-0 flex-1">
            <div className="font-disp text-[16px] uppercase leading-none tracking-disp">Recyclage</div>
            <p className="mt-1 text-[11.5px] leading-snug text-ink-2">
              Transforme un joker possédé en ⅓ de son prix en Kopecks.
            </p>
            {ownedConsumables.length === 0 ? (
              <p className="mt-2 text-[11px] font-semibold text-ink-3">
                Aucun joker à recycler pour l’instant.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {ownedConsumables.map((def) => {
                  const gain = Math.floor(jokerPrice(def)! * JOKER_CONSTANTS.RECYCLAGE_RATE);
                  const key = `rec:${def.id}`;
                  return (
                    <button
                      key={def.id}
                      type="button"
                      disabled={busy === key}
                      onClick={() => recycle(def.id)}
                      className="flex items-center gap-1 border-[2px] border-ink bg-paper px-2 py-1 font-sans text-[11px] font-bold uppercase tracking-[0.04em] shadow-hard disabled:opacity-40"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/jokers/${def.id}.svg`} alt="" width={16} height={16} />
                      {def.name} +{gain}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Inventaire */}
      <section className="mb-2">
        <h2 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-2">
          Mon inventaire
        </h2>
        {ownedConsumables.length === 0 ? (
          <p className="text-[12px] font-semibold text-ink-3">
            Tu n’as pas encore de joker. Achète-en avec tes Kopecks !
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {ownedConsumables.map((def) => (
              <div
                key={def.id}
                className="flex items-center gap-2 border-[2px] border-ink bg-card px-2 py-1 shadow-hard"
                title={getJoker(def.id)?.description}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/jokers/${def.id}.svg`} alt="" width={20} height={20} />
                <span className="text-[11px] font-bold uppercase">{def.name}</span>
                <span className="text-[11px] font-bold text-brand-deep">×{inv[def.id]}</span>
                <span className="text-[10px] font-bold uppercase text-ink-3">{SCOPE_LABEL[def.scope]}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
