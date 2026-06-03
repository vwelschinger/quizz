import { QUIZ_CONFIG, type Category, type Difficulty } from './config';

/** Score attendu du joueur (probabilité de victoire) — formule ELO standard. */
export function expectedScore(playerElo: number, questionElo: number): number {
  return 1 / (1 + Math.pow(10, (questionElo - playerElo) / 400));
}

export interface EloOutcome {
  playerEloBefore: number;
  playerEloAfter: number;
  /** Variation entière appliquée à l'ELO du joueur (peut être négative). */
  delta: number;
  /** Score attendu (0-1) avant la réponse — utile pour debug/affichage. */
  expected: number;
}

/**
 * Met à jour l'ELO du joueur après une réponse (le joueur affronte la question).
 *
 * Conséquences directes de la formule ELO standard :
 *   - battre une question "High" (ELO élevé) rapporte beaucoup d'ELO ;
 *   - échouer sur une question "Low" (ELO faible) fait perdre beaucoup d'ELO.
 */
export function updatePlayerElo(
  playerElo: number,
  questionElo: number,
  isCorrect: boolean,
  kFactor: number = QUIZ_CONFIG.kFactor,
): EloOutcome {
  const expected = expectedScore(playerElo, questionElo);
  const actual = isCorrect ? 1 : 0;
  const delta = Math.round(kFactor * (actual - expected));
  return {
    playerEloBefore: playerElo,
    playerEloAfter: playerElo + delta,
    delta,
    expected,
  };
}

/** ELO de base (caché) d'une question selon sa catégorie et sa difficulté. */
export function baseQuestionElo(category: Category, difficulty: Difficulty): number {
  return QUIZ_CONFIG.categoryBaseElo[category] + QUIZ_CONFIG.difficultyEloOffset[difficulty];
}
