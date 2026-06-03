import { clampPercent } from './difficulty';
import type { Category, Difficulty } from './config';

/**
 * Points bonus pour une bonne réponse = 100 - taux de réussite communautaire.
 * Une mauvaise réponse ne rapporte aucun bonus.
 */
export function bonusPoints(communitySuccessRate: number, isCorrect: boolean): number {
  if (!isCorrect) return 0;
  return Math.round(100 - clampPercent(communitySuccessRate));
}

const CATEGORY_LABEL: Record<Category, string> = {
  abordable: 'Abordable',
  expert: 'Expert',
};

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  high: 'High',
  middle: 'Middle',
  low: 'Low',
};

export function categoryLabel(category: Category): string {
  return CATEGORY_LABEL[category];
}

export function difficultyLabel(difficulty: Difficulty): string {
  return DIFFICULTY_LABEL[difficulty];
}

/** Libellé affiché sur la question, ex : "Expert - High". */
export function questionLabel(category: Category, difficulty: Difficulty): string {
  return `${CATEGORY_LABEL[category]} - ${DIFFICULTY_LABEL[difficulty]}`;
}
