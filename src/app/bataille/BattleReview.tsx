'use client';

import { useState } from 'react';
import type { BattleQuestionReview } from '@/lib/db/battles';

type RowState = 'idle' | 'sending' | 'sent' | 'error';

export default function BattleReview({
  review,
  opponentName,
  battleId,
}: {
  review: BattleQuestionReview[];
  opponentName: string;
  battleId: number;
}) {
  const [state, setState] = useState<Record<number, RowState>>({});
  const [errMsg, setErrMsg] = useState<Record<number, string>>({});

  if (!review || review.length === 0) return null;

  async function contest(questionId: number) {
    setState((s) => ({ ...s, [questionId]: 'sending' }));
    try {
      const res = await fetch(`/api/battles/${battleId}/contest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId }),
      });
      if (res.ok) {
        setState((s) => ({ ...s, [questionId]: 'sent' }));
      } else {
        const d = await res.json().catch(() => ({}));
        setErrMsg((m) => ({ ...m, [questionId]: d.error ?? 'Erreur' }));
        setState((s) => ({ ...s, [questionId]: 'error' }));
      }
    } catch {
      setErrMsg((m) => ({ ...m, [questionId]: 'Erreur réseau' }));
      setState((s) => ({ ...s, [questionId]: 'error' }));
    }
  }

  return (
    <div className="mt-5 flex flex-col gap-3 text-left">
      <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-2">
        Détail des réponses
      </div>
      {review.map((r, i) => {
        const st = state[r.questionId] ?? 'idle';
        return (
          <div key={r.questionId} className="card-hard p-3">
            <div className="text-[14px] font-bold leading-snug">
              Q{i + 1}. {r.prompt}
            </div>
            <div className="mt-2 text-[13px]">
              <span className="text-ink-3">Bonne réponse : </span>
              <span className="font-semibold text-success">{r.correctAnswer}</span>
            </div>
            <div className="mt-2 flex flex-col gap-1 border-t-2 border-[#e4dac6] pt-2 text-[13px]">
              <div>
                <span className="text-ink-3">Toi : </span>
                <span className={r.myCorrect ? 'font-semibold text-success' : 'font-semibold text-fail'}>
                  {r.myAnswer || '—'}
                </span>{' '}
                {r.myCorrect ? '✓' : '✗'}
              </div>
              <div>
                <span className="text-ink-3">{opponentName} : </span>
                <span
                  className={
                    r.opponentCorrect ? 'font-semibold text-success' : 'font-semibold text-fail'
                  }
                >
                  {r.opponentAnswer || '—'}
                </span>{' '}
                {r.opponentCorrect ? '✓' : '✗'}
              </div>
            </div>
            {r.myCorrect === false && (
              <div className="mt-2 border-t-2 border-[#e4dac6] pt-2">
                {st === 'sent' ? (
                  <span className="text-[12px] font-semibold text-brand-deep">
                    ⚑ Contestation envoyée
                  </span>
                ) : (
                  <button
                    onClick={() => contest(r.questionId)}
                    disabled={st === 'sending'}
                    className="text-[12px] font-bold text-brand-deep underline disabled:opacity-50"
                  >
                    {st === 'sending' ? 'Envoi…' : '⚑ Contester ma réponse'}
                  </button>
                )}
                {st === 'error' && (
                  <span className="ml-2 text-[12px] font-semibold text-fail">
                    {errMsg[r.questionId] ?? 'Erreur'}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
