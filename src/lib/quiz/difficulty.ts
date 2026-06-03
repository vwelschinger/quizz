import { QUIZ_CONFIG, type Difficulty } from './config';

/** Borne une valeur dans l'intervalle [0, 100]. */
export function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

/**
 * Difficulté dérivée du taux de réussite communautaire (0-100 %).
 * Le taux est "inversé" : faible réussite => difficulté élevée.
 *   - High   : réussite <= 33 % (très difficile)
 *   - Middle : réussite 34-66 %
 *   - Low    : réussite >= 67 % (facile)
 */
export function difficultyFromSuccessRate(successRate: number): Difficulty {
  const rate = clampPercent(successRate);
  if (rate <= QUIZ_CONFIG.difficultyThresholds.highMax) return 'high';
  if (rate <= QUIZ_CONFIG.difficultyThresholds.middleMax) return 'middle';
  return 'low';
}
