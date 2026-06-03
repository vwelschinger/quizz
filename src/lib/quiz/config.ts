// Constantes de jeu (toutes ajustables). Cœur des règles définies par le PRD.

export type Category = 'abordable' | 'expert';
export type Difficulty = 'high' | 'middle' | 'low';

export const QUIZ_CONFIG = {
  /** ELO de départ d'un nouveau joueur. */
  startingPlayerElo: 800,

  /** K-factor ELO : amplitude des variations à chaque réponse. */
  kFactor: 32,

  /** ELO de base d'une question selon sa catégorie native. */
  categoryBaseElo: {
    abordable: 1000,
    expert: 1400,
  } as Record<Category, number>,

  /** Décalage d'ELO selon la difficulté (High = très dur => ELO plus haut). */
  difficultyEloOffset: {
    high: 200,
    middle: 0,
    low: -200,
  } as Record<Difficulty, number>,

  /**
   * Seuils de taux de réussite communautaire (%) -> difficulté.
   * Spec : High <= 33 %, Middle 34-66 %, Low >= 67 %.
   */
  difficultyThresholds: {
    highMax: 33, // <= 33 % => High (très difficile)
    middleMax: 66, // <= 66 % => Middle ; au-dessus => Low (facile)
  },
} as const;
