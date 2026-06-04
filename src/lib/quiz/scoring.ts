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

/**
 * Échelle de difficulté affichée (1 à 6), dérivée de la combinaison
 * catégorie + difficulté. Abordable = niveaux 1-3, Expert = niveaux 4-6.
 */
const QUESTION_LABEL: Record<Category, Record<Difficulty, string>> = {
  abordable: {
    low: 'Très Facile - 1/6',
    middle: 'Facile - 2/6',
    high: 'Moyenne - 3/6',
  },
  expert: {
    low: 'Difficile - 4/6',
    middle: 'Très Difficile - 5/6',
    high: 'Démoniaque - 6/6',
  },
};

export function categoryLabel(category: Category): string {
  return CATEGORY_LABEL[category];
}

export function difficultyLabel(difficulty: Difficulty): string {
  return DIFFICULTY_LABEL[difficulty];
}

/** Libellé affiché sur la question, ex : "Démoniaque - 6/6". */
export function questionLabel(category: Category, difficulty: Difficulty): string {
  return QUESTION_LABEL[category][difficulty];
}

/**
 * Rang de difficulté sur l'échelle affichée 1-6 (combinaison catégorie + difficulté).
 * Sert au code couleur du badge : 1 = Très Facile (vert clair) … 6 = Démoniaque (violet foncé).
 */
const QUESTION_RANK: Record<Category, Record<Difficulty, number>> = {
  abordable: { low: 1, middle: 2, high: 3 },
  expert: { low: 4, middle: 5, high: 6 },
};

export function difficultyRank(category: Category, difficulty: Difficulty): number {
  return QUESTION_RANK[category][difficulty];
}
