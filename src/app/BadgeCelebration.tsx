'use client';

import { useState } from 'react';

export interface UnlockedBadge {
  id: string;
  name: string;
  description: string;
  tier: string;
}

// Délais des ondes (effet de propagation, façon antenne du logo).
const WAVES = [0, 0.55, 1.1, 1.65, 2.2];

export default function BadgeCelebration({
  badges,
  onClose,
}: {
  badges: UnlockedBadge[];
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  if (!badges || badges.length === 0) return null;

  const b = badges[idx];
  const isLast = idx >= badges.length - 1;
  function next() {
    if (isLast) onClose();
    else setIdx((i) => i + 1);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-6"
      style={{ background: 'rgba(26,22,17,0.88)' }}
      role="dialog"
      aria-modal="true"
    >
      {/* Ondes qui se propagent en arrière-plan */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {WAVES.map((d, i) => (
          <span
            key={i}
            className="badge-wave-ring"
            style={{
              animationDelay: `${d}s`,
              borderColor: i % 2 === 0 ? 'var(--blue-light)' : 'var(--blue-deep)',
            }}
          />
        ))}
      </div>

      {/* Carte de félicitations */}
      <div className="badge-pop relative w-full max-w-[320px] border-[3px] border-ink bg-paper px-6 pb-6 pt-7 text-center shadow-hard-lg">
        <div className="font-disp text-[12px] uppercase tracking-[0.22em] text-brand-deep">
          Félicitations
        </div>
        <div className="mt-1 font-disp text-[30px] uppercase leading-[0.9] tracking-disp">
          Badge débloqué
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/badge-icons/${b.id}.svg`}
          alt={b.name}
          width={132}
          height={132}
          className="mx-auto mt-4 drop-shadow"
        />

        <div className="mt-3 font-disp text-[22px] uppercase leading-[0.95] tracking-disp">
          {b.name}
        </div>
        <div className="mt-1 text-[13px] text-ink-2">{b.description}</div>

        {badges.length > 1 && (
          <div className="mt-2 text-[11px] font-bold text-ink-3">
            {idx + 1} / {badges.length}
          </div>
        )}

        <button onClick={next} className="cta-primary mt-5">
          {isLast ? 'Groovy !' : 'Badge suivant →'}
        </button>
      </div>
    </div>
  );
}
