'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import EloFeedback from './EloFeedback';
import SessionRecap, { type RecapEntry } from './SessionRecap';

interface PublicQuestion {
  id: number;
  category: 'abordable' | 'expert';
  difficulty: 'high' | 'middle' | 'low' | null;
  theme: string | null;
  prompt: string;
  choices: unknown | null;
  label: string;
  communitySuccessRate: number | null;
}

interface AnswerResult {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string | null;
  eloBefore: number;
  eloAfter: number;
  eloDelta: number;
  bonusPoints: number;
  alreadyAnswered: boolean;
}

const SESSION_SIZE = 10;
type Phase = 'loading' | 'question' | 'feedback' | 'recap' | 'empty' | 'error';

function diffClass(d: PublicQuestion['difficulty']): string {
  if (d === 'high') return 'diff-badge--high';
  if (d === 'low') return 'diff-badge--low';
  return 'diff-badge--middle';
}

function badgeText(q: PublicQuestion): string {
  const cat = q.category === 'expert' ? 'EXPERT' : 'ABORDABLE';
  return q.difficulty ? `${cat} · ${q.difficulty.toUpperCase()}` : cat;
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-[18px] pb-[42px] pt-[60px]">
      {children}
    </main>
  );
}

export default function QuizRunner() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [value, setValue] = useState('');
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [entries, setEntries] = useState<RecapEntry[]>([]);
  const [message, setMessage] = useState('');
  const [contest, setContest] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const loadNext = useCallback(async (count: number) => {
    if (count >= SESSION_SIZE) {
      setPhase('recap');
      return;
    }
    setPhase('loading');
    setResult(null);
    setValue('');
    setContest('idle');
    try {
      const res = await fetch('/api/quiz/next');
      if (!res.ok) {
        setMessage('Impossible de charger la question.');
        setPhase('error');
        return;
      }
      const data = await res.json();
      if (!data.question) {
        setPhase(count > 0 ? 'recap' : 'empty');
        return;
      }
      setQuestion(data.question);
      setPhase('question');
    } catch {
      setMessage('Erreur réseau.');
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    loadNext(0);
  }, [loadNext]);

  async function validate() {
    if (!question || !value.trim()) return;
    setPhase('loading');
    try {
      const res = await fetch('/api/quiz/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: question.id, answer: value }),
      });
      if (!res.ok) {
        setMessage('Validation impossible.');
        setPhase('error');
        return;
      }
      const data = await res.json();
      setResult(data.result);
      setPhase('feedback');
    } catch {
      setMessage('Erreur réseau.');
      setPhase('error');
    }
  }

  function next() {
    if (!question || !result) return;
    const count = entries.length + 1;
    setEntries((prev) => [
      ...prev,
      {
        n: prev.length + 1,
        prompt: question.prompt,
        chosen: value,
        correctAnswer: result.correctAnswer,
        isCorrect: result.isCorrect,
        eloDelta: result.eloDelta,
        communityRate: question.communitySuccessRate,
      },
    ]);
    loadNext(count);
  }

  function restart() {
    setEntries([]);
    loadNext(0);
  }

  async function contestAnswer() {
    if (!question) return;
    setContest('sending');
    try {
      const res = await fetch('/api/quiz/contest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: question.id }),
      });
      setContest(res.ok ? 'sent' : 'error');
    } catch {
      setContest('error');
    }
  }

  if (phase === 'recap') {
    return (
      <Frame>
        <SessionRecap entries={entries} onRestart={restart} />
      </Frame>
    );
  }

  if (phase === 'empty' || phase === 'error') {
    return (
      <Frame>
        <div className="mb-4">
          <Link href="/" className="text-[12px] font-semibold text-ink-2 underline">
            ← Tableau de bord
          </Link>
        </div>
        <div className="card-hard p-6 text-center">
          {phase === 'empty' ? (
            <>
              <p className="font-disp text-[22px] uppercase tracking-disp">Aucune question</p>
              <p className="mt-2 text-[13px] text-ink-2">
                Lance une synchro depuis la console admin pour importer les quiz.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-fail">{message}</p>
              <button onClick={() => loadNext(entries.length)} className="cta-primary mt-4">
                Réessayer
              </button>
            </>
          )}
        </div>
      </Frame>
    );
  }

  const completed = entries.length;
  const filled = completed + (phase === 'feedback' ? 1 : 0);
  const currentN = Math.min(SESSION_SIZE, completed + 1);

  return (
    <Frame>
      <div className="mb-3">
        <Link href="/" className="text-[12px] font-semibold text-ink-2 underline">
          ← Tableau de bord
        </Link>
      </div>

      <div className="quiz-top">
        <div className="quiz-blocks">
          {Array.from({ length: SESSION_SIZE }).map((_, i) => (
            <span key={i} className={i < filled ? 'on' : ''} />
          ))}
        </div>
        <div className="quiz-top-row">
          <span className="quiz-count">
            {currentN} / {SESSION_SIZE}
          </span>
          {question && (
            <span className={`diff-badge ${diffClass(question.difficulty)}`}>{badgeText(question)}</span>
          )}
        </div>
      </div>

      {question && (
        <div>
          {question.theme && (
            <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3">
              {question.theme}
            </div>
          )}
          <div className="quiz-q-mark">Q{currentN}</div>
          <h2 className="quiz-q-text">{question.prompt}</h2>
        </div>
      )}

      <div className="min-h-[20px] flex-1" />

      {phase === 'loading' && <p className="text-center text-ink-3">…</p>}

      {phase === 'question' && question && (
        <div className="quiz-answer">
          <input
            className="quiz-input"
            placeholder="Ta réponse…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') validate();
            }}
            autoFocus
          />
          <button className="cta-primary" disabled={!value.trim()} onClick={validate}>
            Valider
          </button>
        </div>
      )}

      {phase === 'feedback' && question && result && (
        <div className="quiz-answer">
          <div className={`quiz-input quiz-input--locked ${result.isCorrect ? 'is-ok' : 'is-ko'}`}>
            <span className="quiz-locked-val">{value || '—'}</span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke={result.isCorrect ? 'var(--success)' : 'var(--fail)'}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              {result.isCorrect ? <path d="M4 12l5 5L20 6" /> : <path d="M6 6l12 12M18 6L6 18" />}
            </svg>
          </div>

          <div className="quiz-correct">
            <span className="quiz-correct-lbl">BONNE RÉPONSE</span>
            <span className="quiz-correct-val">{result.correctAnswer}</span>
          </div>

          <EloFeedback
            delta={result.eloDelta}
            prevElo={result.eloBefore}
            communityRate={question.communitySuccessRate}
          />

          {!result.isCorrect && (
            <button
              type="button"
              onClick={contestAnswer}
              disabled={contest === 'sending' || contest === 'sent'}
              className="flex items-center justify-center gap-2 border-[2px] border-ink bg-card py-2 font-sans text-[12px] font-bold uppercase tracking-[0.06em] text-ink-2 disabled:opacity-60"
            >
              {contest === 'sent'
                ? '⚑ Contestation envoyée'
                : contest === 'error'
                  ? '⚑ Erreur — réessayer'
                  : '⚑ Contester ma réponse'}
            </button>
          )}

          <button className="cta-primary cta-next" onClick={next}>
            {completed + 1 >= SESSION_SIZE ? 'Voir la correction' : 'Question suivante'}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M4 12h15M13 6l7 6-7 6" />
            </svg>
          </button>
        </div>
      )}
    </Frame>
  );
}
