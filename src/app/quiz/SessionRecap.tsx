'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface RecapEntry {
  n: number;
  prompt: string;
  chosen: string;
  correctAnswer: string;
  isCorrect: boolean;
  eloDelta: number;
  communityRate: number | null;
}

export default function SessionRecap({
  entries,
  onRestart,
}: {
  entries: RecapEntry[];
  onRestart: () => void;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'errors'>('all');

  const total = entries.length;
  const okCount = entries.filter((e) => e.isCorrect).length;
  const eloSum = entries.reduce((s, e) => s + e.eloDelta, 0);
  const list = filter === 'errors' ? entries.filter((e) => !e.isCorrect) : entries;

  return (
    <div>
      <header className="corr-head">
        <div className="corr-eyebrow">
          {okCount === total && total > 0 ? 'GROOVY — SANS FAUTE !' : 'SESSION TERMINÉE'}
        </div>
        <div className="corr-title">CORRECTION</div>
      </header>

      <div className="corr-summary">
        <div className="corr-stat">
          <div className="corr-stat-lbl">SCORE ELO</div>
          <div className={`corr-stat-num ${eloSum >= 0 ? 'ok' : 'ko'}`}>
            {eloSum >= 0 ? '+' : '−'}
            {Math.abs(eloSum)}
          </div>
        </div>
        <div className="corr-stat corr-stat--alt">
          <div className="corr-stat-lbl">RÉUSSITE</div>
          <div className="corr-stat-num">
            {okCount}
            <span>/{total}</span>
          </div>
        </div>
      </div>

      <div className="corr-bar">
        {entries.map((e) => (
          <span key={e.n} className={e.isCorrect ? 'ok' : 'ko'} />
        ))}
      </div>

      <div className="corr-filter">
        <button className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>
          TOUT · {total}
        </button>
        <button
          className={filter === 'errors' ? 'is-active' : ''}
          onClick={() => setFilter('errors')}
        >
          ERREURS · {total - okCount}
        </button>
      </div>

      <div className="corr-list">
        {list.map((e) => (
          <div key={e.n} className={`corr-item ${e.isCorrect ? 'ok' : 'ko'}`}>
            <div className="corr-item-top">
              <span className="corr-qn">Q{e.n}</span>
              <span className={`corr-verdict ${e.isCorrect ? 'ok' : 'ko'}`}>
                {e.isCorrect ? 'JUSTE' : 'FAUX'}
              </span>
              <span className={`corr-elo ${e.eloDelta >= 0 ? 'ok' : 'ko'}`}>
                {e.eloDelta >= 0 ? '+' : '−'}
                {Math.abs(e.eloDelta)}
              </span>
            </div>
            <div className="corr-q">{e.prompt}</div>
            <div className="corr-answers">
              {!e.isCorrect && (
                <div className="corr-ans-row">
                  <span className="corr-ans-lbl">VOUS</span>
                  <span className="corr-ans-val ko">{e.chosen || '—'}</span>
                </div>
              )}
              <div className="corr-ans-row">
                <span className="corr-ans-lbl">RÉPONSE</span>
                <span className="corr-ans-val ok">{e.correctAnswer}</span>
              </div>
            </div>
            {e.communityRate != null && (
              <div className="corr-comm">{Math.round(e.communityRate)}% de la communauté a réussi</div>
            )}
          </div>
        ))}
      </div>

      <button
        className="cta-primary mt-4"
        onClick={() => {
          router.push('/');
          router.refresh();
        }}
      >
        Revoir le dashboard
      </button>
      <button
        type="button"
        onClick={onRestart}
        className="mt-3 w-full text-center text-[13px] font-semibold text-ink-2 underline"
      >
        Nouvelle session
      </button>
    </div>
  );
}
