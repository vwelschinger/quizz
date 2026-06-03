import { QUIZ_CONFIG } from './config';
import { expectedScore } from './elo';

export interface BattleEloResult {
  deltaA: number;
  deltaB: number;
  outcome: 'a' | 'b' | 'draw';
}

/**
 * ELO joueur-vs-joueur d'une bataille : A et B affrontent les mêmes questions,
 * `scoreA`/`scoreB` = nombre de bonnes réponses. Le résultat (1 / 0.5 / 0) alimente
 * la formule ELO standard entre les deux classements.
 */
export function battleEloOutcome(
  eloA: number,
  eloB: number,
  scoreA: number,
  scoreB: number,
  kFactor: number = QUIZ_CONFIG.kFactor,
): BattleEloResult {
  const sA = scoreA > scoreB ? 1 : scoreA < scoreB ? 0 : 0.5;
  const deltaA = Math.round(kFactor * (sA - expectedScore(eloA, eloB)));
  const deltaB = Math.round(kFactor * (1 - sA - expectedScore(eloB, eloA)));
  return {
    deltaA,
    deltaB,
    outcome: scoreA > scoreB ? 'a' : scoreA < scoreB ? 'b' : 'draw',
  };
}
