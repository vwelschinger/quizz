'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import EloFeedback from './EloFeedback';
import SessionRecap, { type RecapEntry } from './SessionRecap';
import BadgeCelebration, { type UnlockedBadge } from '../BadgeCelebration';
import { difficultyRank, questionLabel } from '@/lib/quiz/scoring';
import { getJoker } from '@/lib/jokers/catalog';

type Category = 'abordable' | 'expert';
type Difficulty = 'low' | 'middle' | 'high';

interface OwnedJoker {
  id: string;
  qty: number;
}

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
  skipped?: boolean;
  offerSecondChance?: boolean;
}

const SESSION_SIZE = 10;
type Phase = 'loading' | 'question' | 'feedback' | 'recap' | 'empty' | 'error' | 'offer';

function diffClass(q: PublicQuestion): string {
  if (!q.difficulty) return 'diff-badge--lvl0';
  return `diff-badge--lvl${difficultyRank(q.category, q.difficulty)}`;
}

function badgeText(q: PublicQuestion): string {
  return q.label;
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-[18px] pb-[42px] pt-[60px]">
      {children}
    </main>
  );
}

export default function QuizRunner({
  theme,
  category,
  difficulty,
  jokers = [],
}: {
  theme?: string | null;
  category?: Category | null;
  difficulty?: Difficulty | null;
  jokers?: OwnedJoker[];
}) {
  // Libellé + couleur du filtre actif (mode par difficulté).
  const levelActive = !!(category && difficulty);
  const levelLabel = levelActive ? questionLabel(category!, difficulty!) : null;
  const levelClass = levelActive ? `diff-badge--lvl${difficultyRank(category!, difficulty!)}` : '';

  const [phase, setPhase] = useState<Phase>('loading');
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [value, setValue] = useState('');
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [entries, setEntries] = useState<RecapEntry[]>([]);
  const [message, setMessage] = useState('');
  const [contest, setContest] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [celebration, setCelebration] = useState<UnlockedBadge[]>([]);

  // Jokers : inventaire local (décrémenté à l'usage), joker armé et état du 2e essai (Seconde chance).
  const [owned, setOwned] = useState<OwnedJoker[]>(jokers);
  const [selected, setSelected] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(1);
  const [retry, setRetry] = useState(false);
  const [pendingAnswer, setPendingAnswer] = useState(''); // réponse fausse en attente de décision (offre)

  function decrementOwned(id: string) {
    setOwned((prev) =>
      prev.map((j) => (j.id === id ? { ...j, qty: j.qty - 1 } : j)).filter((j) => j.qty > 0),
    );
  }

  const loadNext = useCallback(async (count: number) => {
    if (count >= SESSION_SIZE) {
      setPhase('recap');
      return;
    }
    setPhase('loading');
    setResult(null);
    setValue('');
    setContest('idle');
    setSelected(null);
    setAttempt(1);
    setRetry(false);
    setPendingAnswer('');
    try {
      const qs = new URLSearchParams();
      if (theme) qs.set('theme', theme);
      if (category && difficulty) {
        qs.set('category', category);
        qs.set('difficulty', difficulty);
      }
      const url = qs.toString() ? `/api/quiz/next?${qs.toString()}` : '/api/quiz/next';
      const res = await fetch(url);
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
  }, [theme, category, difficulty]);

  useEffect(() => {
    loadNext(0);
  }, [loadNext]);

  // Entrée pendant le feedback → question suivante (en saisie, l'input gère déjà Entrée → Valider).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter' && phase === 'feedback') {
        e.preventDefault();
        next();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Envoie une réponse au serveur. `jokerJustUsed`/`attemptArg` pilotent l'effet joker côté serveur.
  async function submit(answer: string, jokerJustUsed: string | null, attemptArg: number, decline = false) {
    if (!question) return;
    setPhase('loading');
    try {
      const res = await fetch('/api/quiz/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: question.id,
          answer,
          jokerId: jokerJustUsed ?? undefined,
          attempt: attemptArg,
          declineSecondChance: decline || undefined,
        }),
      });
      if (!res.ok) {
        setMessage('Validation impossible.');
        setPhase('error');
        return;
      }
      const data = await res.json();
      const r: AnswerResult = data.result;

      // Esquive : question passée → on recharge une question de remplacement sur le même créneau.
      if (r.skipped) {
        decrementOwned('esquive');
        loadNext(entries.length);
        return;
      }
      // Réponse fausse + Seconde chance en stock → on propose au joueur de l'activer (réponse cachée).
      if (r.offerSecondChance) {
        setPendingAnswer(answer);
        setPhase('offer');
        return;
      }
      // Réponse enregistrée : décrémenter le joker effectivement consommé (miroir du serveur).
      if (jokerJustUsed === 'cafeine' || jokerJustUsed === 'dopage') decrementOwned(jokerJustUsed);
      else if (jokerJustUsed === 'gilet-pare-balles' && !r.isCorrect) decrementOwned('gilet-pare-balles');
      else if (jokerJustUsed === 'seconde-chance' && attemptArg === 2) decrementOwned('seconde-chance');

      setResult(r);
      if (Array.isArray(data.newBadges) && data.newBadges.length > 0) {
        setCelebration(data.newBadges);
      }
      setPhase('feedback');
    } catch {
      setMessage('Erreur réseau.');
      setPhase('error');
    }
  }

  function validate() {
    if (!value.trim()) return;
    submit(value, selected, attempt);
  }

  // « Je ne sais pas » : réponse vide comptée incorrecte (applique le joker armé le cas échéant).
  function skip() {
    setValue('');
    submit('', selected, attempt);
  }

  // Offre de Seconde chance : accepter → 2e essai (réponse cachée) ; refuser → finaliser la réponse fausse.
  function acceptSecondChance() {
    setRetry(true);
    setAttempt(2);
    setSelected('seconde-chance');
    setValue('');
    setPhase('question');
  }
  function declineSecondChance() {
    submit(pendingAnswer, null, 1, true);
  }

  // Esquive : action immédiate (passe la question, aucun impact).
  function useEsquive() {
    submit('', 'esquive', 1);
  }

  function toggleJoker(id: string) {
    if (id === 'esquive') {
      useEsquive();
      return;
    }
    setSelected((cur) => (cur === id ? null : id));
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
                {theme
                  ? `Tu as déjà répondu à toutes les questions du thème « ${theme} ».`
                  : levelActive
                    ? `Tu as déjà répondu à toutes les questions « ${levelLabel} ».`
                    : 'Lance une synchro depuis la console admin pour importer les quiz.'}
              </p>
              {theme && (
                <Link href="/themes" className="cta-primary mt-4">
                  Choisir un autre thème
                </Link>
              )}
              {levelActive && (
                <Link href="/difficulte" className="cta-primary mt-4">
                  Choisir une autre difficulté
                </Link>
              )}
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
      {celebration.length > 0 && (
        <BadgeCelebration badges={celebration} onClose={() => setCelebration([])} />
      )}
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link href="/" className="text-[12px] font-semibold text-ink-2 underline">
          ← Tableau de bord
        </Link>
        {theme && (
          <span className="border-[2px] border-ink bg-brand-soft px-2 py-[2px] font-disp text-[12px] uppercase tracking-disp">
            {theme}
          </span>
        )}
        {levelLabel && (
          <span className={`diff-badge ${levelClass}`}>{levelLabel}</span>
        )}
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
            <span className={`diff-badge ${diffClass(question)}`}>{badgeText(question)}</span>
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

      {/* Espace souple : pousse la réponse vers le bas sur grand écran, réduit sur mobile
          pour que la question reste visible quand le clavier s'ouvre. */}
      <div className="h-5 shrink-0 sm:min-h-[20px] sm:flex-1" />

      {phase === 'loading' && <p className="text-center text-ink-3">…</p>}

      {phase === 'offer' && (
        <div className="quiz-answer">
          <div className="border-[3px] border-fail bg-card px-4 py-3 text-center shadow-hard">
            <div className="font-disp text-[20px] uppercase tracking-disp text-fail">
              Mauvaise réponse
            </div>
            <p className="mt-1 text-[12px] font-semibold text-ink-2">
              Tu as une <b>Seconde chance</b> en stock. L’activer pour retenter ? La bonne réponse reste
              cachée. Si tu réussis au 2e essai, ELO et Kopecks comptent à moitié.
            </p>
          </div>
          <button className="cta-primary" onClick={acceptSecondChance}>
            Oui, je retente
          </button>
          <button
            type="button"
            onClick={declineSecondChance}
            className="border-[2px] border-ink bg-card py-2 font-disp text-[14px] uppercase tracking-disp shadow-hard"
          >
            Non, valider ma réponse
          </button>
        </div>
      )}

      {phase === 'question' && question && (
        <div className="quiz-answer">
          {owned.some((j) => j.id !== 'seconde-chance') && !retry && (
            <div className="flex flex-wrap gap-2">
              {owned
                .filter((j) => j.id !== 'seconde-chance')
                .map((j) => {
                const def = getJoker(j.id);
                if (!def) return null;
                const active = selected === j.id;
                return (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => toggleJoker(j.id)}
                    title={`${def.name} — ${def.description}`}
                    className={`flex items-center gap-1 border-[2px] border-ink px-2 py-1 font-sans text-[11px] font-bold uppercase tracking-[0.04em] shadow-hard ${active ? 'bg-ink text-cream' : 'bg-card text-ink'}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/jokers/${j.id}.svg`} alt="" width={18} height={18} />
                    {def.name}
                    {j.qty > 1 && <span className="opacity-70">×{j.qty}</span>}
                  </button>
                );
              })}
            </div>
          )}
          {retry && (
            <div className="border-[2px] border-fail bg-card px-3 py-2 text-[12px] font-bold text-fail">
              Faux… mais c’est ta seconde chance ! Retente — la bonne réponse reste cachée.
            </div>
          )}
          <button type="button" className="quiz-skip" onClick={skip}>
            Je ne sais pas&nbsp;:O
          </button>
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
