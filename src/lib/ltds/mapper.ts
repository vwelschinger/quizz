import type { NormalizedQuestion } from '@/lib/db/questions';
import type { Category } from '@/lib/quiz/config';
import type { LtdsDay, LtdsGameResponse } from './types';

function getDay(payload: unknown): LtdsDay | null {
  const p = payload as LtdsGameResponse | null;
  return p?.day ?? null;
}

/** Un jour est "complet" si ses questions ET ses stats communautaires sont présentes. */
export function isDayComplete(payload: unknown): boolean {
  const day = getDay(payload);
  if (!day || !Array.isArray(day.questions) || day.questions.length === 0) return false;
  const qr = day.results?.questionResults;
  return !!qr && typeof qr === 'object' && Object.keys(qr).length > 0;
}

/** Convertit une réponse /game/{level}/{day} en questions normalisées. */
export function mapGameDay(payload: unknown): NormalizedQuestion[] {
  const day = getDay(payload);
  if (!day || !Array.isArray(day.questions)) return [];

  const category: Category = day.difficulty === 'difficile' ? 'expert' : 'abordable';
  const prefix = day.difficulty ?? 'facile';
  const dayNumber = day.dayNumber;
  const results = day.results?.questionResults ?? {};
  const quizDate =
    typeof day.dayExpiresAt === 'string' && /^\d{4}-\d{2}-\d{2}/.test(day.dayExpiresAt)
      ? day.dayExpiresAt.slice(0, 10)
      : null;

  return day.questions.map((q) => {
    const stat = results[String(q.order)];
    const pctIncorrect =
      stat && typeof stat.percentageIncorrect === 'number' ? stat.percentageIncorrect : null;
    const successRate =
      pctIncorrect == null ? null : Math.max(0, Math.min(100, 100 - pctIncorrect));
    const valid = Array.isArray(q.validAnswers) ? q.validAnswers.map((a) => String(a)) : [];
    return {
      sourceId: `${prefix}-${dayNumber}-${q.order}`,
      quizDate,
      category,
      theme: typeof q.theme === 'string' && q.theme ? q.theme : null,
      prompt: String(q.text ?? ''),
      choices: null,
      acceptedAnswers: valid.length ? valid : null,
      correctAnswer: valid[0] ?? '',
      explanation: null,
      communitySuccessRate: successRate,
    };
  });
}
