import type { Category, Difficulty } from '@/lib/quiz/config';

export type Role = 'user' | 'admin';
export type { Category, Difficulty };

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  role: Role;
  elo: number;
  created_at: Date;
}

export interface QuestionRow {
  id: number;
  source_id: string | null;
  quiz_date: Date | null;
  category: Category;
  theme: string | null;
  prompt: string;
  choices: unknown | null; // jsonb
  accepted_answers: unknown | null; // jsonb : string[] des réponses acceptées
  correct_answer: string;
  explanation: string | null;
  community_success_rate: string | null; // NUMERIC -> string via pg
  difficulty: Difficulty | null;
  question_elo: number;
  created_at: Date;
  updated_at: Date;
}

export interface AnswerRow {
  id: string; // BIGSERIAL -> string via pg
  user_id: number;
  question_id: number;
  is_correct: boolean;
  chosen_answer: string | null;
  elo_before: number;
  elo_after: number;
  elo_delta: number;
  question_elo: number;
  bonus_points: number;
  answered_at: Date;
}
