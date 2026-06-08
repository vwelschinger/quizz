import type { BadgeTier } from '@/lib/badges/catalog';

// Récompenses en Kopecks (barème validé). Badges : crédit au déblocage. Batailles : crédit à la résolution.

export const BADGE_KOPECKS: Record<BadgeTier, number> = {
  bronze: 100,
  argent: 250,
  or: 500,
};

export type BattleOutcomeKey = 'win' | 'draw' | 'loss';

export const BATTLE_KOPECKS: Record<BattleOutcomeKey, number> = {
  win: 50,
  draw: 20,
  loss: 10,
};
