import type { PoolClient } from 'pg';
import { query, queryOne, withTransaction } from './pool';
import { updatePlayerElo } from '@/lib/quiz/elo';
import { battleEloOutcome } from '@/lib/quiz/battleElo';
import { bonusPoints } from '@/lib/quiz/scoring';

interface ContestationRow {
  id: number;
  user_id: number;
  question_id: number;
  chosen_answer: string;
  status: 'pending' | 'accepted' | 'rejected';
  battle_id: number | null;
}

/** Contestation d'une réponse SOLO : seulement si le joueur a répondu FAUX en solo. */
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

/** Contestation d'une réponse de BATAILLE : seulement si la réponse de bataille était fausse. */
export async function createBattleContestation(
  userId: number,
  battleId: number,
  questionId: number,
): Promise<{ ok: boolean; reason?: string }> {
  const ba = await queryOne<{ is_correct: boolean; chosen_answer: string | null }>(
    'SELECT is_correct, chosen_answer FROM battle_answers WHERE battle_id = $1 AND user_id = $2 AND question_id = $3',
    [battleId, userId, questionId],
  );
  if (!ba) return { ok: false, reason: 'Réponse introuvable.' };
  if (ba.is_correct) return { ok: false, reason: 'Ta réponse est déjà correcte.' };

  await query(
    `INSERT INTO contestations (user_id, question_id, chosen_answer, battle_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, question_id) DO NOTHING`,
    [userId, questionId, ba.chosen_answer ?? '', battleId],
  );
  return { ok: true };
}

export interface ContestationView {
  id: number;
  username: string;
  prompt: string;
  correctAnswer: string;
  chosenAnswer: string;
  battleId: number | null;
}

export function listPendingContestations(): Promise<ContestationView[]> {
  return query<ContestationView>(
    `SELECT c.id, u.username, q.prompt,
            q.correct_answer AS "correctAnswer", c.chosen_answer AS "chosenAnswer",
            c.battle_id AS "battleId"
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
 * Recalcule une bataille après qu'une réponse a été passée à juste (contestation acceptée).
 * Renvoie l'ajustement d'ELO du contestataire.
 */
async function recreditBattle(
  client: PoolClient,
  battleId: number,
  userId: number,
  questionId: number,
): Promise<number> {
  await client.query(
    'UPDATE battle_answers SET is_correct = true WHERE battle_id = $1 AND user_id = $2 AND question_id = $3',
    [battleId, userId, questionId],
  );
  const bRes = await client.query<{
    challenger_id: number;
    opponent_id: number;
    challenger_elo_before: number | null;
    opponent_elo_before: number | null;
    challenger_elo_delta: number | null;
    opponent_elo_delta: number | null;
    status: string;
  }>(
    `SELECT challenger_id, opponent_id, challenger_elo_before, opponent_elo_before,
            challenger_elo_delta, opponent_elo_delta, status
     FROM battles WHERE id = $1 FOR UPDATE`,
    [battleId],
  );
  const b = bRes.rows[0];
  if (!b || b.status !== 'finished' || b.challenger_elo_before == null || b.opponent_elo_before == null) {
    return 0;
  }

  const scRes = await client.query<{ user_id: number; n: number }>(
    'SELECT user_id, (count(*) FILTER (WHERE is_correct))::int AS n FROM battle_answers WHERE battle_id = $1 GROUP BY user_id',
    [battleId],
  );
  let chScore = 0;
  let opScore = 0;
  for (const r of scRes.rows) {
    if (r.user_id === b.challenger_id) chScore = r.n;
    else if (r.user_id === b.opponent_id) opScore = r.n;
  }

  const outcome = battleEloOutcome(b.challenger_elo_before, b.opponent_elo_before, chScore, opScore);
  const chAdjust = outcome.deltaA - (b.challenger_elo_delta ?? 0);
  const opAdjust = outcome.deltaB - (b.opponent_elo_delta ?? 0);
  const winnerId = chScore > opScore ? b.challenger_id : chScore < opScore ? b.opponent_id : null;

  if (chAdjust !== 0) await client.query('UPDATE users SET elo = elo + $1 WHERE id = $2', [chAdjust, b.challenger_id]);
  if (opAdjust !== 0) await client.query('UPDATE users SET elo = elo + $1 WHERE id = $2', [opAdjust, b.opponent_id]);
  await client.query(
    `UPDATE battles SET challenger_score = $1, opponent_score = $2,
       challenger_elo_delta = $3, opponent_elo_delta = $4, winner_id = $5 WHERE id = $6`,
    [chScore, opScore, outcome.deltaA, outcome.deltaB, winnerId, battleId],
  );

  // notifier l'AUTRE joueur (non contestataire) si son ELO a bougé
  const otherId = userId === b.challenger_id ? b.opponent_id : b.challenger_id;
  const otherAdjust = userId === b.challenger_id ? opAdjust : chAdjust;
  if (otherAdjust !== 0) {
    await client.query(
      "INSERT INTO notifications (user_id, kind, prompt, elo_delta, link) VALUES ($1, 'battle_recomputed', $2, $3, $4)",
      [otherId, 'Une bataille a été recalculée suite à une contestation.', otherAdjust, `/bataille/${battleId}`],
    );
  }

  return userId === b.challenger_id ? chAdjust : opAdjust;
}

/**
 * Résout une contestation (solo ou bataille). Si acceptée : la réponse devient une variante
 * acceptée de la question, et l'ELO du joueur est recrédité (solo) ou la bataille recalculée (PvP).
 * Dans tous les cas, une notification est créée pour le joueur.
 */
export async function resolveContestation(
  id: number,
  accept: boolean,
  adminId: number,
): Promise<number | null> {
  return withTransaction(async (client) => {
    const cRes = await client.query<ContestationRow>(
      'SELECT * FROM contestations WHERE id = $1 FOR UPDATE',
      [id],
    );
    const c = cRes.rows[0];
    if (!c || c.status !== 'pending') return null;

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
    let eloDelta = 0;

    if (accept) {
      // 1) ajouter la réponse contestée aux variantes acceptées (solo + bataille)
      if (q) {
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
      }

      if (c.battle_id != null) {
        // 2a) bataille : on recalcule le résultat + l'ELO PvP des deux joueurs
        eloDelta = await recreditBattle(client, c.battle_id, c.user_id, c.question_id);
      } else if (q) {
        // 2b) solo : on recrédite la réponse du joueur
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

    const link = c.battle_id != null ? `/bataille/${c.battle_id}` : null;
    await client.query(
      'INSERT INTO notifications (user_id, kind, prompt, elo_delta, link) VALUES ($1, $2, $3, $4, $5)',
      [c.user_id, accept ? 'contest_accepted' : 'contest_rejected', prompt, eloDelta, link],
    );
    return c.user_id;
  });
}
