import { withTransaction, query, queryOne } from './pool';
import type { QuestionRow } from './types';
import { expectedScore } from '@/lib/quiz/elo';
import { QUIZ_CONFIG } from '@/lib/quiz/config';
import { bonusPoints } from '@/lib/quiz/scoring';
import { isAnswerCorrect } from '@/lib/quiz/answer';
import { getJoker } from '@/lib/jokers/catalog';
import {
  consumeJoker,
  applyJokerToVariation,
  applyJokerToBonus,
  secondChanceVariation,
} from '@/lib/jokers/engine';
import { postBonus } from '@/lib/jokers/ledger';

export interface AnswerResult {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string | null;
  eloBefore: number;
  eloAfter: number;
  eloDelta: number;
  bonusPoints: number;
  alreadyAnswered: boolean;
  /** Esquive : la question a été passée, aucune ligne `answers` écrite. */
  skipped?: boolean;
  /**
   * Réponse fausse + le joueur possède « Seconde chance » : on lui propose de l'activer. Rien n'est
   * écrit, l'ELO n'est pas appliqué et la bonne réponse n'est PAS révélée tant qu'il n'a pas décidé.
   */
  offerSecondChance?: boolean;
}

export interface SubmitAnswerOptions {
  jokerId?: string | null;
  attempt?: number; // 2 = 2e essai de « Seconde chance »
  /** Le joueur a refusé la Seconde chance proposée → on finalise la réponse fausse normalement. */
  declineSecondChance?: boolean;
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
  opts: SubmitAnswerOptions = {},
): Promise<AnswerResult | null> {
  const rawJoker = opts.jokerId ?? null;
  const attempt = opts.attempt ?? 1;
  const declineSecondChance = opts.declineSecondChance ?? false;
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

    // Joker valide pour le solo (consommable, scope solo). qty vérifiée au moment de la consommation.
    const jokerDef = rawJoker ? getJoker(rawJoker) : null;
    const validSolo = !!jokerDef && jokerDef.kind === 'consumable' && jokerDef.scope === 'solo';
    const secondTry = rawJoker === 'seconde-chance' && attempt === 2;

    const neutral = (extra: Partial<AnswerResult>): AnswerResult => ({
      isCorrect: false,
      correctAnswer: '', // on ne révèle PAS la réponse (skip / offre de seconde chance)
      explanation: null,
      eloBefore: user.elo,
      eloAfter: user.elo,
      eloDelta: 0,
      bonusPoints: 0,
      alreadyAnswered: false,
      ...extra,
    });

    // ── Esquive : passe la question, aucune ligne `answers`, aucun impact ──
    if (validSolo && rawJoker === 'esquive' && !secondTry) {
      const consumed = await consumeJoker(client, userId, 'esquive');
      if (consumed) return neutral({ skipped: true });
      // pas le joker en stock → on retombe sur une réponse normale
    }

    // ── Seconde chance RÉACTIVE : réponse fausse, aucun joker armé, le joueur la possède et ne l'a pas
    //    refusée → on la PROPOSE (rien n'est écrit, ELO non appliqué, bonne réponse non révélée). ──
    if (!correct && attempt === 1 && !declineSecondChance && (rawJoker === null || rawJoker === 'seconde-chance')) {
      const r = await client.query<{ qty: number }>(
        'SELECT qty FROM user_jokers WHERE user_id = $1 AND joker_id = $2',
        [userId, 'seconde-chance'],
      );
      if ((r.rows[0]?.qty ?? 0) > 0) return neutral({ offerSecondChance: true });
    }

    // `activeJoker` = joker armé dont l'effet s'applique au calcul (après consommation).
    let activeJoker: string | null = null;
    // 2e essai de Seconde chance ACCEPTÉ : on consomme le joker maintenant.
    const secondTryActive = secondTry ? await consumeJoker(client, userId, 'seconde-chance') : false;

    if (!secondTry && validSolo && rawJoker !== 'esquive' && rawJoker !== 'seconde-chance') {
      if (rawJoker === 'gilet-pare-balles') {
        if (!correct) {
          const consumed = await consumeJoker(client, userId, 'gilet-pare-balles');
          activeJoker = consumed ? 'gilet-pare-balles' : null;
        }
        // juste : gilet rendu, aucun effet
      } else if (rawJoker === 'cafeine' || rawJoker === 'dopage') {
        const consumed = await consumeJoker(client, userId, rawJoker);
        activeJoker = consumed ? rawJoker : null;
      }
    }

    // Variation d'ELO et bonus, après effet joker (arrondi APRÈS multiplication, cf. engine).
    const rawDelta = QUIZ_CONFIG.kFactor * ((correct ? 1 : 0) - expectedScore(user.elo, question.question_elo));
    let delta: number;
    let bonus: number;
    if (secondTryActive) {
      // 2e essai : gain ×½ si juste, perte pleine si faux ; bonus ×½ si juste.
      delta = secondChanceVariation(rawDelta, correct);
      bonus = applyJokerToBonus(bonusPoints(rate, correct), 'seconde-chance', true);
    } else {
      delta = applyJokerToVariation(rawDelta, activeJoker);
      bonus = applyJokerToBonus(bonusPoints(rate, correct), activeJoker, false);
    }
    const eloAfter = user.elo + delta;

    const insertRes = await client.query<{ id: number }>(
      `INSERT INTO answers
         (user_id, question_id, is_correct, chosen_answer, elo_before, elo_after,
          elo_delta, question_elo, bonus_points)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [userId, questionId, correct, chosenAnswer, user.elo, eloAfter, delta, question.question_elo, bonus],
    );
    await client.query('UPDATE users SET elo = $1 WHERE id = $2', [eloAfter, userId]);

    // Crédit du solde dépensable (ledger) pour une bonne réponse — miroir de answers.bonus_points.
    if (bonus > 0) {
      await postBonus(client, userId, bonus, 'solo_answer', { type: 'answer', id: insertRes.rows[0].id });
    }

    return {
      isCorrect: correct,
      correctAnswer: question.correct_answer,
      explanation: question.explanation,
      eloBefore: user.elo,
      eloAfter,
      eloDelta: delta,
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

/**
 * Série quotidienne : nombre de jours calendaires consécutifs (fuseau Europe/Paris) où le joueur a
 * répondu à ≥ 1 question, en remontant depuis aujourd'hui. La série reste « vivante » si le joueur a
 * joué hier mais pas encore aujourd'hui ; elle est rompue (0) si le dernier jour joué est antérieur à hier.
 */
export async function getDailyStreak(
  userId: number,
): Promise<{ days: number; playedToday: boolean }> {
  const rows = await query<{ d: string }>(
    `SELECT DISTINCT to_char((answered_at AT TIME ZONE 'Europe/Paris')::date, 'YYYY-MM-DD') AS d
     FROM answers WHERE user_id = $1
     ORDER BY d DESC`,
    [userId],
  );
  if (rows.length === 0) return { days: 0, playedToday: false };

  const toDayNum = (s: string) => Math.floor(Date.parse(`${s}T00:00:00Z`) / 86400000);
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' }); // YYYY-MM-DD
  const today = toDayNum(todayStr);
  const days = rows.map((r) => toDayNum(r.d)); // décroissant

  const playedToday = days[0] === today;
  if (days[0] < today - 1) return { days: 0, playedToday: false };

  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    if (days[i] === days[i - 1] - 1) streak++;
    else break;
  }
  return { days: streak, playedToday };
}

export interface EloHistoryRow {
  questionId: number;
  prompt: string;
  questionElo: number;
  eloBefore: number;
  eloAfter: number;
  eloDelta: number;
  isCorrect: boolean;
}

export interface ThemeBreakdownRow {
  theme: string;
  answered: number;
  correct: number;
  successRate: number; // %
}

/** Réussite du joueur ventilée par thème (pour la fiche joueur). */
export async function getThemeBreakdown(userId: number): Promise<ThemeBreakdownRow[]> {
  const rows = await query<{ theme: string; answered: number; correct: number }>(
    `SELECT q.theme,
            count(*)::int AS answered,
            coalesce(sum((a.is_correct)::int), 0)::int AS correct
       FROM answers a
       JOIN questions q ON q.id = a.question_id
      WHERE a.user_id = $1 AND q.theme IS NOT NULL AND q.theme <> ''
      GROUP BY q.theme
      ORDER BY answered DESC, q.theme ASC`,
    [userId],
  );
  return rows.map((r) => ({
    theme: r.theme,
    answered: r.answered,
    correct: r.correct,
    successRate: r.answered > 0 ? Math.round((r.correct / r.answered) * 100) : 0,
  }));
}

export interface AnsweredQuestionRow {
  questionId: number;
  prompt: string;
  theme: string | null;
  isCorrect: boolean;
  eloDelta: number;
  chosenAnswer: string | null;
  correctAnswer: string;
  answeredAt: string;
}

/** Liste des questions auxquelles le joueur a répondu, plus récentes d'abord (fiche joueur). */
export async function listAnsweredQuestions(
  userId: number,
  limit = 100,
): Promise<AnsweredQuestionRow[]> {
  const rows = await query<{
    questionId: number;
    prompt: string;
    theme: string | null;
    isCorrect: boolean;
    eloDelta: number;
    chosenAnswer: string | null;
    correctAnswer: string;
    answeredAt: Date;
  }>(
    `SELECT a.question_id AS "questionId", q.prompt, q.theme,
            a.is_correct AS "isCorrect", a.elo_delta AS "eloDelta",
            a.chosen_answer AS "chosenAnswer", q.correct_answer AS "correctAnswer",
            a.answered_at AS "answeredAt"
       FROM answers a
       JOIN questions q ON q.id = a.question_id
      WHERE a.user_id = $1
      ORDER BY a.answered_at DESC
      LIMIT $2`,
    [userId, limit],
  );
  return rows.map((r) => ({
    questionId: r.questionId,
    prompt: r.prompt,
    theme: r.theme,
    isCorrect: r.isCorrect,
    eloDelta: r.eloDelta,
    chosenAnswer: r.chosenAnswer,
    correctAnswer: r.correctAnswer,
    answeredAt: r.answeredAt.toISOString(),
  }));
}

/** Historique ELO du joueur, par ordre chronologique (pour le graphe + la liste des stats). */
export function getEloHistory(userId: number): Promise<EloHistoryRow[]> {
  return query<EloHistoryRow>(
    `SELECT a.question_id AS "questionId", q.prompt,
            a.question_elo AS "questionElo", a.elo_before AS "eloBefore",
            a.elo_after AS "eloAfter", a.elo_delta AS "eloDelta",
            a.is_correct AS "isCorrect"
     FROM answers a
     JOIN questions q ON q.id = a.question_id
     WHERE a.user_id = $1
     ORDER BY a.answered_at ASC`,
    [userId],
  );
}
