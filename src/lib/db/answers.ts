import { withTransaction, query, queryOne } from './pool';
import type { QuestionRow } from './types';
import { updatePlayerElo } from '@/lib/quiz/elo';
import { bonusPoints } from '@/lib/quiz/scoring';
import { isAnswerCorrect } from '@/lib/quiz/answer';

export interface AnswerResult {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string | null;
  eloBefore: number;
  eloAfter: number;
  eloDelta: number;
  bonusPoints: number;
  alreadyAnswered: boolean;
}

/**
 * Enregistre la réponse d'un joueur, calcule l'ELO et le bonus, persiste le tout
 * de façon transactionnelle (verrou sur la ligne user pour la cohérence ELO).
 * Renvoie null si l'utilisateur ou la question n'existe pas.
 */
export async function submitAnswer(
  userId: number,
  questionId: number,
  chosenAnswer: string,
): Promise<AnswerResult | null> {
  return withTransaction(async (client) => {
    const userRes = await client.query<{ elo: number }>(
      'SELECT elo FROM users WHERE id = $1 FOR UPDATE',
      [userId],
    );
    const user = userRes.rows[0];
    if (!user) return null;

    const qRes = await client.query<QuestionRow>('SELECT * FROM questions WHERE id = $1', [
      questionId,
    ]);
    const question = qRes.rows[0];
    if (!question) return null;

    // Déjà répondu ? On renvoie l'état existant sans rejouer l'ELO (flux question unique).
    const existingRes = await client.query<{
      is_correct: boolean;
      elo_before: number;
      elo_after: number;
      elo_delta: number;
      bonus_points: number;
    }>(
      `SELECT is_correct, elo_before, elo_after, elo_delta, bonus_points
       FROM answers WHERE user_id = $1 AND question_id = $2`,
      [userId, questionId],
    );
    const existing = existingRes.rows[0];
    if (existing) {
      return {
        isCorrect: existing.is_correct,
        correctAnswer: question.correct_answer,
        explanation: question.explanation,
        eloBefore: existing.elo_before,
        eloAfter: existing.elo_after,
        eloDelta: existing.elo_delta,
        bonusPoints: existing.bonus_points,
        alreadyAnswered: true,
      };
    }

    const rate =
      question.community_success_rate == null ? 0 : Number(question.community_success_rate);
    const accepted = Array.isArray(question.accepted_answers)
      ? (question.accepted_answers as string[])
      : [question.correct_answer];
    const correct = isAnswerCorrect(accepted, chosenAnswer);
    const outcome = updatePlayerElo(user.elo, question.question_elo, correct);
    const bonus = bonusPoints(rate, correct);

    await client.query(
      `INSERT INTO answers
         (user_id, question_id, is_correct, chosen_answer, elo_before, elo_after,
          elo_delta, question_elo, bonus_points)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        questionId,
        correct,
        chosenAnswer,
        outcome.playerEloBefore,
        outcome.playerEloAfter,
        outcome.delta,
        question.question_elo,
        bonus,
      ],
    );
    await client.query('UPDATE users SET elo = $1 WHERE id = $2', [outcome.playerEloAfter, userId]);

    return {
      isCorrect: correct,
      correctAnswer: question.correct_answer,
      explanation: question.explanation,
      eloBefore: outcome.playerEloBefore,
      eloAfter: outcome.playerEloAfter,
      eloDelta: outcome.delta,
      bonusPoints: bonus,
      alreadyAnswered: false,
    };
  });
}

export interface UserStats {
  answered: number;
  correct: number;
  bonus: number;
  successRate: number; // %
}

export async function getUserStats(userId: number): Promise<UserStats> {
  const row = await queryOne<{ answered: number; correct: number; bonus: number }>(
    `SELECT count(*)::int AS answered,
            coalesce(sum(case when is_correct then 1 else 0 end), 0)::int AS correct,
            coalesce(sum(bonus_points), 0)::int AS bonus
     FROM answers WHERE user_id = $1`,
    [userId],
  );
  const answered = row?.answered ?? 0;
  const correct = row?.correct ?? 0;
  const bonus = row?.bonus ?? 0;
  return {
    answered,
    correct,
    bonus,
    successRate: answered > 0 ? Math.round((correct / answered) * 100) : 0,
  };
}

/** Tendance ELO récente : somme des variations sur les N dernières réponses. */
export async function getRecentEloTrend(userId: number, lastN = 10): Promise<number> {
  const row = await queryOne<{ trend: number }>(
    `SELECT coalesce(sum(elo_delta), 0)::int AS trend FROM (
       SELECT elo_delta FROM answers WHERE user_id = $1 ORDER BY answered_at DESC LIMIT $2
     ) recent`,
    [userId, lastN],
  );
  return row?.trend ?? 0;
}

/** Série en cours : nombre de bonnes réponses consécutives depuis la plus récente. */
export async function getCurrentStreak(userId: number): Promise<number> {
  const rows = await query<{ is_correct: boolean }>(
    'SELECT is_correct FROM answers WHERE user_id = $1 ORDER BY answered_at DESC LIMIT 200',
    [userId],
  );
  let streak = 0;
  for (const r of rows) {
    if (r.is_correct) streak++;
    else break;
  }
  return streak;
}
