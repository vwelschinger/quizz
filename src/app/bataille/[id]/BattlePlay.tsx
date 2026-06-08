'use client';

import { useState } from 'react';
import Link from 'next/link';
import BattleReview from '../BattleReview';
import BadgeCelebration, { type UnlockedBadge } from '../../BadgeCelebration';
import type { BattleQuestionReview } from '@/lib/db/battles';
import { difficultyRank } from '@/lib/quiz/scoring';

interface PublicQuestion {
  id: number;
  category: 'abordable' | 'expert';
  difficulty: 'high' | 'middle' | 'low' | null;
  theme: string | null;
  prompt: string;
  label: string;
  communitySuccessRate: number | null;
}

interface PlayResult {
  score: number;
  total: number;
  status: 'waiting' | 'finished';
  resolved: boolean;
  outcome?: 'win' | 'loss' | 'draw';
  eloDelta?: number;
  opponentScore?: number;
  opponentName?: string;
  review?: BattleQuestionReview[];
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-[18px] pb-[42px] pt-[60px]">
      {children}
    </main>
  );
}
function diffClass(q: PublicQuestion): string {
  if (!q.difficulty) return 'diff-badge--lvl0';
  return `diff-badge--lvl${difficultyRank(q.category, q.difficulty)}`;
}
function badge(q: PublicQuestion): string {
  return q.label;
}

export default function BattlePlay({
  battleId,
  opponentName,
  questions,
  ownsFourbe = false,
}: {
  battleId: number;
  opponentName: string;
  questions: PublicQuestion[];
  ownsFourbe?: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState('');
  const [answers, setAnswers] = useState<{ questionId: number; answer: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PlayResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<UnlockedBadge[]>([]);
  const [fourbe, setFourbe] = useState(false); // Fourbe engagé pour cette manche (1re question ×2)

  const total = questions.length;
  const q = questions[idx];

  async function submitAll(all: { questionId: number; answer: string }[]) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/battles/${battleId}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: all, jokerId: fourbe ? 'fourbe' : undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Soumission impossible');
        return;
      }
      setResult(data);
      if (Array.isArray(data.newBadges) && data.newBadges.length > 0) {
        setCelebration(data.newBadges);
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    if (!q) return;
    const all = [...answers, { questionId: q.id, answer: value }];
    setAnswers(all);
    setValue('');
    if (idx + 1 >= total) submitAll(all);
    else setIdx(idx + 1);
  }

  if (result) {
    if (result.status === 'finished') {
      const win = result.outcome === 'win';
      const draw = result.outcome === 'draw';
      const delta = result.eloDelta ?? 0;
      return (
        <Frame>
          {celebration.length > 0 && (
            <BadgeCelebration badges={celebration} onClose={() => setCelebration([])} />
          )}
          <div className="card-hard p-6 text-center">
            <div
              className={`font-disp text-[34px] uppercase tracking-disp ${win ? 'text-success' : draw ? 'text-ink' : 'text-fail'}`}
            >
              {win ? 'Victoire' : draw ? 'Match nul' : 'Défaite'}
            </div>
            {win && (
              <div className="mt-1 text-[12px] font-extrabold uppercase tracking-[0.18em] text-success">
                Groovy !
              </div>
            )}
            <div className="mt-3 font-disp text-[44px] leading-none tracking-disp">
              {result.score} – {result.opponentScore}
            </div>
            <div className="mt-1 text-[12px] font-semibold uppercase tracking-[0.04em] text-ink-2">
              vs {result.opponentName ?? opponentName}
            </div>
            <div
              className={`mt-4 inline-block border-[3px] border-ink px-4 py-2 font-disp text-[22px] tracking-disp ${delta >= 0 ? 'text-success' : 'text-fail'}`}
            >
              ELO {delta >= 0 ? `+${delta}` : delta}
            </div>
          </div>
          <BattleReview
            review={result.review ?? []}
            opponentName={result.opponentName ?? opponentName}
            battleId={battleId}
          />
          <Link href="/bataille" className="cta-primary mt-5">
            Retour aux batailles
          </Link>
        </Frame>
      );
    }
    return (
      <Frame>
        <div className="card-hard p-6 text-center">
          <div className="font-disp text-[28px] uppercase tracking-disp">Bravo !</div>
          <p className="mt-2 text-[14px] text-ink-2">
            Tu as fait <b>{result.score}/{result.total}</b>. En attente de <b>{opponentName}</b> pour le verdict.
          </p>
        </div>
        <Link href="/bataille" className="cta-primary mt-5">
          Retour aux batailles
        </Link>
      </Frame>
    );
  }

  if (error) {
    return (
      <Frame>
        <div className="card-hard p-6 text-center">
          <p className="font-semibold text-fail">{error}</p>
          <Link href="/bataille" className="cta-primary mt-4">
            Retour
          </Link>
        </div>
      </Frame>
    );
  }

  if (!q) {
    return (
      <Frame>
        <p className="text-center text-ink-3">…</p>
      </Frame>
    );
  }

  return (
    <Frame>
      <div className="mb-3">
        <Link href="/bataille" className="text-[12px] font-semibold text-ink-2 underline">
          ← Abandonner
        </Link>
      </div>
      <div className="quiz-top">
        <div className="quiz-blocks">
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} className={i < idx ? 'on' : ''} />
          ))}
        </div>
        <div className="quiz-top-row">
          <span className="quiz-count">
            {idx + 1} / {total}
          </span>
          <span className={`diff-badge ${diffClass(q)}`}>{badge(q)}</span>
        </div>
      </div>

      <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3">
        Duel vs {opponentName}
        {q.theme ? ` · ${q.theme}` : ''}
      </div>
      <div className="quiz-q-mark">Q{idx + 1}</div>
      <h2 className="quiz-q-text">{q.prompt}</h2>

      {ownsFourbe && idx === 0 && (
        <button
          type="button"
          onClick={() => setFourbe((f) => !f)}
          title="Ta 1re question comptera double à la résolution."
          className={`mt-3 flex items-center gap-2 self-start border-[2px] border-ink px-3 py-2 font-sans text-[12px] font-bold uppercase tracking-[0.04em] shadow-hard ${fourbe ? 'bg-ink text-cream' : 'bg-card text-ink'}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/jokers/fourbe.svg" alt="" width={20} height={20} />
          {fourbe ? 'Fourbe activé — 1re question ×2' : 'Activer Fourbe (1re ×2)'}
        </button>
      )}

      <div className="min-h-[20px] flex-1" />

      <div className="quiz-answer">
        <input
          className="quiz-input"
          placeholder="Ta réponse…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') next();
          }}
          autoFocus
        />
        <button className="cta-primary" disabled={submitting} onClick={next}>
          {idx + 1 >= total ? (submitting ? '…' : 'Terminer') : 'Suivant'}
        </button>
      </div>
    </Frame>
  );
}
