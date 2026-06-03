import { query, queryOne, withTransaction } from './pool';
import { updatePlayerElo } from '@/lib/quiz/elo';
import { bonusPoints } from '@/lib/quiz/scoring';

interface ContestationRow {
  id: number;
  user_id: number;
  question_id: number;
  chosen_answer: string;
  status: 'pending' | 'accepted' | 'rejected';
}

/** Crée une contestation : seulement si le joueur a répondu FAUX à cette question. */
export async function createContestation(
  userId: number,
  questionId: number,
): Promise<{ ok: boolean; reason?: string }> {
  const answer = await queryOne<{ is_correct: boolean; chosen_answer: string | null }>(
    'SELECT is_correct, chosen_answer FROM answers WHERE user_id = $1 AND question_id = $2',
    [userId, questionId],
  );
  if (!answer) return { ok: false, reason: "Tu n'as pas répondu à cette question." };
  if (answer.is_correct) return { ok: false, reason: 'Ta réponse est déjà correcte.' };

  await query(
    `INSERT INTO contestations (user_id, question_id, chosen_answer)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, question_id) DO NOTHING`,
    [userId, questionId, answer.chosen_answer ?? ''],
  );
  return { ok: true };
}

export interface ContestationView {
  id: number;
  username: string;
  prompt: string;
  correctAnswer: string;
  chosenAnswer: string;
}

export function listPendingContestations(): Promise<ContestationView[]> {
  return query<ContestationView>(
    `SELECT c.id, u.username, q.prompt,
            q.correct_answer AS "correctAnswer", c.chosen_answer AS "chosenAnswer"
     FROM contestations c
     JOIN users u ON u.id = c.user_id
     JOIN questions q ON q.id = c.question_id
     WHERE c.status = 'pending'
     ORDER BY c.created_at ASC`,
  );
}

export async function countPendingContestations(): Promise<number> {
  const row = await queryOne<{ count: number }>(
    "SELECT count(*)::int AS count FROM contestations WHERE status = 'pending'",
  );
  return row?.count ?? 0;
}

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Résout une contestation. Si acceptée :
 *  - la réponse contestée devient une variante acceptée de la question ;
 *  - la réponse du joueur est repassée en "correct" et son ELO est recrédité
 *    (différence entre le gain mérité et la perte initiale) + bonus.
 */
export async function resolveContestation(
  id: number,
  accept: boolean,
  adminId: number,
): Promise<boolean> {
  return withTransaction(async (client) => {
    const cRes = await client.query<ContestationRow>(
      'SELECT * FROM contestations WHERE id = $1 FOR UPDATE',
      [id],
    );
    const c = cRes.rows[0];
    if (!c || c.status !== 'pending') return false;

    const qRes = await client.query<{
      prompt: string;
      accepted_answers: unknown;
      correct_answer: string;
      community_success_rate: string | null;
    }>(
      'SELECT prompt, accepted_answers, correct_answer, community_success_rate FROM questions WHERE id = $1',
      [c.question_id],
    );
    const q = qRes.rows[0];
    const prompt = q?.prompt ?? null;
    let eloDelta = 0; // évolution d'ELO recréditée au joueur (0 si refus / déjà juste)

    if (accept) {
      if (q) {
        // 1) ajouter la réponse contestée aux variantes acceptées
        const accepted: string[] = Array.isArray(q.accepted_answers)
          ? (q.accepted_answers as string[])
          : q.correct_answer
            ? [q.correct_answer]
            : [];
        if (!accepted.some((a) => norm(a) === norm(c.chosen_answer))) {
          accepted.push(c.chosen_answer);
          await client.query(
            'UPDATE questions SET accepted_answers = $1::jsonb, updated_at = now() WHERE id = $2',
            [JSON.stringify(accepted), c.question_id],
          );
        }

        // 2) recréditer le joueur (sa réponse passe de faux à juste)
        const aRes = await client.query<{
          id: string;
          is_correct: boolean;
          elo_before: number;
          elo_delta: number;
          question_elo: number;
        }>(
          'SELECT id, is_correct, elo_before, elo_delta, question_elo FROM answers WHERE user_id = $1 AND question_id = $2 FOR UPDATE',
          [c.user_id, c.question_id],
        );
        const a = aRes.rows[0];
        if (a && !a.is_correct) {
          const rate = q.community_success_rate == null ? 0 : Number(q.community_success_rate);
          const correctDelta = updatePlayerElo(a.elo_before, a.question_elo, true).delta;
          eloDelta = correctDelta - a.elo_delta;
          const bonus = bonusPoints(rate, true);
          await client.query(
            'UPDATE answers SET is_correct = true, elo_delta = $1, elo_after = $2, bonus_points = $3 WHERE id = $4',
            [correctDelta, a.elo_before + correctDelta, bonus, a.id],
          );
          await client.query('UPDATE users SET elo = elo + $1 WHERE id = $2', [eloDelta, c.user_id]);
        }
      }
      await client.query(
        "UPDATE contestations SET status = 'accepted', resolved_at = now(), resolved_by = $1 WHERE id = $2",
        [adminId, id],
      );
    } else {
      await client.query(
        "UPDATE contestations SET status = 'rejected', resolved_at = now(), resolved_by = $1 WHERE id = $2",
        [adminId, id],
      );
    }

    // notification au joueur (acceptée ou refusée), avec l'évolution d'ELO
    await client.query(
      'INSERT INTO notifications (user_id, kind, prompt, elo_delta) VALUES ($1, $2, $3, $4)',
      [c.user_id, accept ? 'contest_accepted' : 'contest_rejected', prompt, eloDelta],
    );
    return true;
  });
}
