'use client';

import { useEffect, useRef, useState } from 'react';

function useCountUp(from: number, to: number, duration = 900): number {
  const [val, setVal] = useState(from);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setVal(to);
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setVal(Math.round(from + (to - from) * e));
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [from, to, duration]);

  return val;
}

export default function EloFeedback({
  delta,
  prevElo,
  communityRate,
}: {
  delta: number;
  prevElo: number;
  communityRate: number | null;
}) {
  const win = delta >= 0;
  const newElo = prevElo + delta;
  const val = useCountUp(prevElo, newElo);
  const accent = win ? 'var(--success)' : 'var(--fail)';
  const soft = win ? 'var(--success-soft)' : 'var(--fail-soft)';
  const sign = win ? '+' : '−';

  return (
    <div className="elo-card" style={{ background: soft, borderColor: accent }}>
      <div className="elo-card-label">SCORE ELO</div>
      <div className="elo-counter-row">
        <span className="elo-counter-num">{val.toLocaleString('fr-FR')}</span>
        <div
          className="elo-delta-chip"
          style={{ color: accent, background: '#fff', borderColor: accent }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            {win ? <path d="M7 13L7 1M7 1L2 6M7 1L12 6" /> : <path d="M7 1L7 13M7 13L2 8M7 13L12 8" />}
          </svg>
          <span>
            {sign}
            {Math.abs(delta)}
          </span>
        </div>
      </div>
      <div className="elo-card-sub">
        {communityRate != null ? (
          <>
            <span style={{ color: accent, fontWeight: 700 }}>{Math.round(communityRate)}%</span> de la
            communauté a réussi
          </>
        ) : (
          'Statistiques communautaires indisponibles'
        )}
      </div>
    </div>
  );
}
