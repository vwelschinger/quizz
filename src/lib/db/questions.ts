import { query, queryOne } from './pool';
import type { Category, Difficulty, QuestionRow } from './types';
import { difficultyFromSuccessRate } from '@/lib/quiz/difficulty';
import { baseQuestionElo } from '@/lib/quiz/elo';
import { questionLabel, categoryLabel } from '@/lib/quiz/scoring';

export interface NormalizedQuestion {
  sourceId: string | null;
  quizDate: string | null; // YYYY-MM-DD
  category: Category;
  theme: string | null;
  prompt: string;
  choices: unknown | null;
  acceptedAnswers: string[] | null; // validAnswers ; [0] = canonique
  correctAnswer: string;
  explanation: string | null;
  communitySuccessRate: number | null;
}

/** Upsert idempotent (par source_id) : recalcule difficulté + ELO question. */
export async function upsertQuestion(q: NormalizedQuestion): Promise<void> {
  const rate = q.communitySuccessRate;
  const difficulty: Difficulty | null = rate == null ? null : difficultyFromSuccessRate(rate);
  const elo = baseQuestionElo(q.category, difficulty ?? 'middle');
  await query(
    `INSERT INTO questions
       (source_id, quiz_date, category, theme, prompt, choices, accepted_answers,
        correct_answer, explanation, community_success_rate, difficulty, question_elo)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11, $12)
     ON CONFLICT (source_id) DO UPDATE SET
       quiz_date = EXCLUDED.quiz_date,
       category = EXCLUDED.category,
       theme = EXCLUDED.theme,
       prompt = EXCLUDED.prompt,
       choices = EXCLUDED.choices,
       accepted_answers = EXCLUDED.accepted_answers,
       correct_answer = EXCLUDED.correct_answer,
       explanation = EXCLUDED.explanation,
       community_success_rate = EXCLUDED.community_success_rate,
       difficulty = EXCLUDED.difficulty,
       question_elo = EXCLUDED.question_elo,
       updated_at = now()`,
    [
      q.sourceId,
      q.quizDate,
      q.category,
      q.theme,
      q.prompt,
      q.choices == null ? null : JSON.stringify(q.choices),
      q.acceptedAnswers == null ? null : JSON.stringify(q.acceptedAnswers),
      q.correctAnswer,
      q.explanation,
      rate,
      difficulty,
      elo,
    ],
  );
}

export function getQuestionById(id: number): Promise<QuestionRow | null> {
  return queryOne<QuestionRow>('SELECT * FROM questions WHERE id = $1', [id]);
}

/**
 * Prochaine question NON répondue pour l'utilisateur — "scaffolding progressif" :
 * on prend les 12 questions dont l'ELO est le plus proche de celui du joueur,
 * puis une au hasard parmi elles (variété + adéquation au niveau).
 * Si `theme` est fourni, on restreint la sélection à ce thème (session à thème).
 */
export function pickNextQuestionForUser(
  userId: number,
  playerElo: number,
  theme?: string | null,
): Promise<QuestionRow | null> {
  return queryOne<QuestionRow>(
    `SELECT * FROM (
       SELECT q.* FROM questions q
       WHERE NOT EXISTS (
         SELECT 1 FROM answers a WHERE a.user_id = $1 AND a.question_id = q.id
       )
       AND ($3::text IS NULL OR q.theme = $3)
       ORDER BY abs(q.question_elo - $2) ASC
       LIMIT 12
     ) candidates
     ORDER BY random()
     LIMIT 1`,
    [userId, playerElo, theme ?? null],
  );
}

export async function countQuestions(): Promise<number> {
  const row = await queryOne<{ count: number }>('SELECT count(*)::int AS count FROM questions');
  return row?.count ?? 0;
}

export interface ThemeInfo {
  theme: string;
  total: number; // nombre de questions du thème
}

/** Liste des thèmes existants (texte libre synchronisé), avec le nombre de questions. */
export async function listThemes(): Promise<ThemeInfo[]> {
  const rows = await query<{ theme: string; total: number }>(
    `SELECT theme, count(*)::int AS total
       FROM questions
      WHERE theme IS NOT NULL AND theme <> ''
      GROUP BY theme
      ORDER BY total DESC, theme ASC`,
  );
  return rows.map((r) => ({ theme: r.theme, total: r.total }));
}

export interface PublicQuestion {
  id: number;
  category: Category;
  difficulty: Difficulty | null;
  theme: string | null;
  prompt: string;
  choices: unknown | null;
  label: string; // ex : "Expert - High"
  communitySuccessRate: number | null;
}

/** Vue publique d'une question : SANS la/les bonne(s) réponse(s) (révélées après "Valider"). */
export function toPublicQuestion(row: QuestionRow): PublicQuestion {
  return {
    id: row.id,
    category: row.category,
    difficulty: row.difficulty,
    theme: row.theme,
    prompt: row.prompt,
    choices: row.choices,
    label: row.difficulty
      ? questionLabel(row.category, row.difficulty)
      : categoryLabel(row.category),
    communitySuccessRate:
      row.community_success_rate == null ? null : Number(row.community_success_rate),
  };
}
