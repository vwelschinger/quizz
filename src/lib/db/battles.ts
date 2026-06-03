import { query, queryOne, withTransaction } from './pool';
import { toPublicQuestion, type PublicQuestion } from './questions';
import type { QuestionRow } from './types';
import { isAnswerCorrect } from '@/lib/quiz/answer';
import { battleEloOutcome } from '@/lib/quiz/battleElo';

interface BattleRow {
  id: number;
  challenger_id: number;
  opponent_id: number;
  question_ids: unknown; // jsonb int[]
  status: 'waiting' | 'finished';
  challenger_score: number | null;
  opponent_score: number | null;
  challenger_elo_before: number | null;
  opponent_elo_before: number | null;
  challenger_elo_delta: number | null;
  opponent_elo_delta: number | null;
  winner_id: number | null;
  created_at: Date;
  resolved_at: Date | null;
}

type BattleRowWithNames = BattleRow & { challenger_name: string; opponent_name: string };

function questionIdsOf(b: BattleRow): number[] {
  return Array.isArray(b.question_ids) ? (b.question_ids as number[]) : [];
}

async function publicQuestionsByIds(ids: number[]): Promise<PublicQuestion[]> {
  if (ids.length === 0) return [];
  const rows = await query<QuestionRow>('SELECT * FROM questions WHERE id = ANY($1::int[])', [ids]);
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids
    .map((id) => byId.get(id))
    .filter((r): r is QuestionRow => !!r)
    .map(toPublicQuestion);
}

/** Choisit N questions qu'aucun des deux joueurs n'a vues en solo (fraîcheur + équité). */
export async function pickBattleQuestionIds(
  challengerId: number,
  opponentId: number,
  size: number,
): Promise<number[]> {
  const rows = await query<{ id: number }>(
    `SELECT id FROM questions q
     WHERE NOT EXISTS (
       SELECT 1 FROM answers a WHERE a.question_id = q.id AND a.user_id IN ($1, $2)
     )
     ORDER BY random() LIMIT $3`,
    [challengerId, opponentId, size],
  );
  return rows.map((r) => r.id);
}

export async function createBattle(
  challengerId: number,
  opponentId: number,
  size = 5,
  challengerName?: string,
): Promise<{ id: number } | null> {
  const questionIds = await pickBattleQuestionIds(challengerId, opponentId, size);
  if (questionIds.length === 0) return null;
  const row = await queryOne<{ id: number }>(
    `INSERT INTO battles (challenger_id, opponent_id, question_ids)
     VALUES ($1, $2, $3::jsonb) RETURNING id`,
    [challengerId, opponentId, JSON.stringify(questionIds)],
  );
  if (!row) return null;

  // notifier l'adversaire qu'il est défié
  const name =
    challengerName ??
    (await queryOne<{ username: string }>('SELECT username FROM users WHERE id = $1', [challengerId]))
      ?.username ??
    'Un joueur';
  await query(
    "INSERT INTO notifications (user_id, kind, prompt, link) VALUES ($1, 'battle_challenge', $2, $3)",
    [opponentId, `${name} te défie en bataille !`, `/bataille/${row.id}`],
  );

  return { id: row.id };
}

export interface BattlePlayResult {
  score: number;
  total: number;
  status: 'waiting' | 'finished';
  resolved: boolean;
  outcome?: 'win' | 'loss' | 'draw';
  eloDelta?: number;
  eloAfter?: number;
  opponentScore?: number;
  opponentName?: string;
}

/**
 * Enregistre les réponses d'un joueur à une bataille (transaction + verrou sur la ligne battle).
 * Si les deux joueurs ont joué, résout : calcule le vainqueur et applique l'ELO PvP aux deux.
 */
export async function playBattle(
  battleId: number,
  userId: number,
  answers: { questionId: number; answer: string }[],
): Promise<BattlePlayResult | { error: string }> {
  return withTransaction(async (client) => {
    const bRes = await client.query<BattleRow>('SELECT * FROM battles WHERE id = $1 FOR UPDATE', [
      battleId,
    ]);
    const battle = bRes.rows[0];
    if (!battle) return { error: 'Bataille introuvable' };

    const isChallenger = battle.challenger_id === userId;
    const isOpponent = battle.opponent_id === userId;
    if (!isChallenger && !isOpponent) return { error: 'Tu ne participes pas à cette bataille.' };
    if (battle.status === 'finished') return { error: 'Bataille déjà terminée.' };
    if (isChallenger && battle.challenger_score != null) return { error: 'Tu as déjà joué.' };
    if (isOpponent && battle.opponent_score != null) return { error: 'Tu as déjà joué.' };

    const ids = new Set(questionIdsOf(battle));
    const total = ids.size;
    let score = 0;

    for (const a of answers) {
      if (!ids.has(a.questionId)) continue;
      const qRes = await client.query<{ accepted_answers: unknown; correct_answer: string }>(
        'SELECT accepted_answers, correct_answer FROM questions WHERE id = $1',
        [a.questionId],
      );
      const q = qRes.rows[0];
      if (!q) continue;
      const accepted = Array.isArray(q.accepted_answers)
        ? (q.accepted_answers as string[])
        : [q.correct_answer];
      const correct = isAnswerCorrect(accepted, a.answer);
      if (correct) score++;
      await client.query(
        `INSERT INTO battle_answers (battle_id, user_id, question_id, is_correct, chosen_answer)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (battle_id, user_id, question_id) DO NOTHING`,
        [battleId, userId, a.questionId, correct, a.answer],
      );
    }

    await client.query(
      `UPDATE battles SET ${isChallenger ? 'challenger_score' : 'opponent_score'} = $1 WHERE id = $2`,
      [score, battleId],
    );

    const challengerScore = isChallenger ? score : battle.challenger_score;
    const opponentScore = isOpponent ? score : battle.opponent_score;

    if (challengerScore == null || opponentScore == null) {
      return { score, total, status: 'waiting', resolved: false };
    }

    // Les deux ont joué → résolution.
    const uRes = await client.query<{ id: number; elo: number; username: string }>(
      'SELECT id, elo, username FROM users WHERE id IN ($1, $2) FOR UPDATE',
      [battle.challenger_id, battle.opponent_id],
    );
    const ch = uRes.rows.find((u) => u.id === battle.challenger_id);
    const op = uRes.rows.find((u) => u.id === battle.opponent_id);
    if (!ch || !op) return { error: 'Joueur introuvable.' };

    const { deltaA: chDelta, deltaB: opDelta } = battleEloOutcome(
      ch.elo,
      op.elo,
      challengerScore,
      opponentScore,
    );
    await client.query('UPDATE users SET elo = elo + $1 WHERE id = $2', [chDelta, battle.challenger_id]);
    await client.query('UPDATE users SET elo = elo + $1 WHERE id = $2', [opDelta, battle.opponent_id]);

    const winnerId =
      challengerScore > opponentScore
        ? battle.challenger_id
        : challengerScore < opponentScore
          ? battle.opponent_id
          : null;
    await client.query(
      `UPDATE battles SET status = 'finished', challenger_elo_before = $1, opponent_elo_before = $2,
         challenger_elo_delta = $3, opponent_elo_delta = $4, winner_id = $5, resolved_at = now()
       WHERE id = $6`,
      [ch.elo, op.elo, chDelta, opDelta, winnerId, battleId],
    );

    // notifier l'AUTRE joueur (celui qui avait joué en premier) que la bataille est terminée
    const otherId = isChallenger ? battle.opponent_id : battle.challenger_id;
    const otherDelta = isChallenger ? opDelta : chDelta;
    const resolverName = isChallenger ? ch.username : op.username;
    const otherScore = isChallenger ? opponentScore : challengerScore;
    const otherLabel =
      otherScore > score ? 'Victoire' : otherScore < score ? 'Défaite' : 'Match nul';
    await client.query(
      "INSERT INTO notifications (user_id, kind, prompt, elo_delta, link) VALUES ($1, 'battle_finished', $2, $3, $4)",
      [otherId, `Bataille vs ${resolverName} terminée — ${otherLabel}`, otherDelta, `/bataille/${battleId}`],
    );

    const myDelta = isChallenger ? chDelta : opDelta;
    const myEloBefore = isChallenger ? ch.elo : op.elo;
    const oppScore = isChallenger ? opponentScore : challengerScore;
    const oppName = isChallenger ? op.username : ch.username;
    const outcome: 'win' | 'loss' | 'draw' =
      score > oppScore ? 'win' : score < oppScore ? 'loss' : 'draw';

    return {
      score,
      total,
      status: 'finished',
      resolved: true,
      outcome,
      eloDelta: myDelta,
      eloAfter: myEloBefore + myDelta,
      opponentScore: oppScore,
      opponentName: oppName,
    };
  });
}

export interface BattleSummary {
  id: number;
  role: 'challenger' | 'opponent';
  opponentName: string;
  status: 'waiting' | 'finished';
  myPlayed: boolean;
  opponentPlayed: boolean;
  myScore: number | null;
  opponentScore: number | null;
  total: number;
  outcome: 'win' | 'loss' | 'draw' | null;
  eloDelta: number | null;
  createdAt: string;
}

export async function listBattlesForUser(userId: number): Promise<BattleSummary[]> {
  const rows = await query<BattleRowWithNames>(
    `SELECT b.*, cu.username AS challenger_name, ou.username AS opponent_name
     FROM battles b
     JOIN users cu ON cu.id = b.challenger_id
     JOIN users ou ON ou.id = b.opponent_id
     WHERE b.challenger_id = $1 OR b.opponent_id = $1
     ORDER BY b.created_at DESC
     LIMIT 50`,
    [userId],
  );
  return rows.map((b) => {
    const role: 'challenger' | 'opponent' = b.challenger_id === userId ? 'challenger' : 'opponent';
    const myScore = role === 'challenger' ? b.challenger_score : b.opponent_score;
    const opponentScore = role === 'challenger' ? b.opponent_score : b.challenger_score;
    const outcome =
      b.status === 'finished'
        ? b.winner_id == null
          ? 'draw'
          : b.winner_id === userId
            ? 'win'
            : 'loss'
        : null;
    return {
      id: b.id,
      role,
      opponentName: role === 'challenger' ? b.opponent_name : b.challenger_name,
      status: b.status,
      myPlayed: myScore != null,
      opponentPlayed: opponentScore != null,
      myScore,
      opponentScore,
      total: questionIdsOf(b).length,
      outcome,
      eloDelta: role === 'challenger' ? b.challenger_elo_delta : b.opponent_elo_delta,
      createdAt: b.created_at.toISOString(),
    };
  });
}

/** Nombre de batailles où c'est au tour de l'utilisateur de jouer (notif). */
export async function countPendingBattlesForUser(userId: number): Promise<number> {
  const row = await queryOne<{ count: number }>(
    `SELECT count(*)::int AS count FROM battles
     WHERE status = 'waiting'
       AND ((challenger_id = $1 AND challenger_score IS NULL)
         OR (opponent_id = $1 AND opponent_score IS NULL))`,
    [userId],
  );
  return row?.count ?? 0;
}

/** Bilan batailles du joueur : total terminées, victoires, défaites. */
export async function getBattleStatsForUser(
  userId: number,
): Promise<{ total: number; wins: number; losses: number }> {
  const row = await queryOne<{ total: number; wins: number; losses: number }>(
    `SELECT
       (count(*) FILTER (WHERE status = 'finished'))::int AS total,
       (count(*) FILTER (WHERE status = 'finished' AND winner_id = $1))::int AS wins,
       (count(*) FILTER (WHERE status = 'finished' AND winner_id IS NOT NULL AND winner_id <> $1))::int AS losses
     FROM battles
     WHERE challenger_id = $1 OR opponent_id = $1`,
    [userId],
  );
  return { total: row?.total ?? 0, wins: row?.wins ?? 0, losses: row?.losses ?? 0 };
}

export interface BattleQuestionReview {
  questionId: number;
  prompt: string;
  correctAnswer: string;
  myAnswer: string | null;
  myCorrect: boolean | null;
  opponentAnswer: string | null;
  opponentCorrect: boolean | null;
}

/** Détail par question d'une bataille : réponses des deux joueurs + bonne réponse. */
export async function getBattleReview(
  battleId: number,
  userId: number,
): Promise<BattleQuestionReview[]> {
  const b = await queryOne<{ challenger_id: number; opponent_id: number; question_ids: unknown }>(
    'SELECT challenger_id, opponent_id, question_ids FROM battles WHERE id = $1',
    [battleId],
  );
  if (!b) return [];
  const ids = Array.isArray(b.question_ids) ? (b.question_ids as number[]) : [];
  if (ids.length === 0) return [];
  const opponentId = b.challenger_id === userId ? b.opponent_id : b.challenger_id;

  const questions = await query<{ id: number; prompt: string; correct_answer: string }>(
    'SELECT id, prompt, correct_answer FROM questions WHERE id = ANY($1::int[])',
    [ids],
  );
  const qById = new Map(questions.map((q) => [q.id, q]));

  const answers = await query<{
    user_id: number;
    question_id: number;
    is_correct: boolean;
    chosen_answer: string | null;
  }>('SELECT user_id, question_id, is_correct, chosen_answer FROM battle_answers WHERE battle_id = $1', [
    battleId,
  ]);
  const k = (u: number, q: number) => `${u}:${q}`;
  const aByKey = new Map(answers.map((a) => [k(a.user_id, a.question_id), a]));

  return ids.map((qid) => {
    const q = qById.get(qid);
    const mine = aByKey.get(k(userId, qid));
    const opp = aByKey.get(k(opponentId, qid));
    return {
      questionId: qid,
      prompt: q?.prompt ?? '',
      correctAnswer: q?.correct_answer ?? '',
      myAnswer: mine?.chosen_answer ?? null,
      myCorrect: mine ? mine.is_correct : null,
      opponentAnswer: opp?.chosen_answer ?? null,
      opponentCorrect: opp ? opp.is_correct : null,
    };
  });
}

export type BattleView =
  | { state: 'play'; battleId: number; opponentName: string; questions: PublicQuestion[]; total: number }
  | { state: 'waiting'; opponentName: string; myScore: number; total: number; opponentPlayed: boolean }
  | {
      state: 'finished';
      opponentName: string;
      myScore: number;
      opponentScore: number;
      outcome: 'win' | 'loss' | 'draw';
      eloDelta: number;
      review: BattleQuestionReview[];
    }
  | { state: 'notfound' }
  | { state: 'forbidden' };

export async function getBattleView(battleId: number, userId: number): Promise<BattleView> {
  const b = await queryOne<BattleRowWithNames>(
    `SELECT b.*, cu.username AS challenger_name, ou.username AS opponent_name
     FROM battles b
     JOIN users cu ON cu.id = b.challenger_id
     JOIN users ou ON ou.id = b.opponent_id
     WHERE b.id = $1`,
    [battleId],
  );
  if (!b) return { state: 'notfound' };

  const isChallenger = b.challenger_id === userId;
  const isOpponent = b.opponent_id === userId;
  if (!isChallenger && !isOpponent) return { state: 'forbidden' };

  const myScore = isChallenger ? b.challenger_score : b.opponent_score;
  const oppScore = isChallenger ? b.opponent_score : b.challenger_score;
  const oppName = isChallenger ? b.opponent_name : b.challenger_name;
  const total = questionIdsOf(b).length;

  if (b.status === 'finished') {
    const outcome: 'win' | 'loss' | 'draw' =
      b.winner_id == null ? 'draw' : b.winner_id === userId ? 'win' : 'loss';
    const eloDelta = (isChallenger ? b.challenger_elo_delta : b.opponent_elo_delta) ?? 0;
    return {
      state: 'finished',
      opponentName: oppName,
      myScore: myScore ?? 0,
      opponentScore: oppScore ?? 0,
      outcome,
      eloDelta,
      review: await getBattleReview(b.id, userId),
    };
  }

  if (myScore == null) {
    return {
      state: 'play',
      battleId: b.id,
      opponentName: oppName,
      questions: await publicQuestionsByIds(questionIdsOf(b)),
      total,
    };
  }

  return { state: 'waiting', opponentName: oppName, myScore, total, opponentPlayed: oppScore != null };
}

export interface AdminBattleRow {
  id: number;
  challengerName: string;
  opponentName: string;
  status: 'waiting' | 'finished';
  challengerScore: number | null;
  opponentScore: number | null;
  total: number;
  winnerName: string | null;
  createdAt: string;
}

/** Admin : toutes les batailles du jeu, plus récentes d'abord. */
export async function listAllBattles(limit = 100): Promise<AdminBattleRow[]> {
  const rows = await query<BattleRowWithNames & { winner_name: string | null }>(
    `SELECT b.*, cu.username AS challenger_name, ou.username AS opponent_name,
            wu.username AS winner_name
     FROM battles b
     JOIN users cu ON cu.id = b.challenger_id
     JOIN users ou ON ou.id = b.opponent_id
     LEFT JOIN users wu ON wu.id = b.winner_id
     ORDER BY b.created_at DESC
     LIMIT $1`,
    [limit],
  );
  return rows.map((b) => ({
    id: b.id,
    challengerName: b.challenger_name,
    opponentName: b.opponent_name,
    status: b.status,
    challengerScore: b.challenger_score,
    opponentScore: b.opponent_score,
    total: questionIdsOf(b).length,
    winnerName: b.winner_name,
    createdAt: b.created_at.toISOString(),
  }));
}
