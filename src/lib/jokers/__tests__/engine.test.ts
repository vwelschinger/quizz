import { describe, it, expect } from 'vitest';
import {
  jokerEloMultiplier,
  applyJokerToVariation,
  applyJokerToBonus,
  effectiveBattleScore,
  isJokerUsableInScope,
} from '../engine';

describe('jokerEloMultiplier', () => {
  it('×2 Caféine, ×3 Dopage, ×1 sinon', () => {
    expect(jokerEloMultiplier('cafeine')).toBe(2);
    expect(jokerEloMultiplier('dopage')).toBe(3);
    expect(jokerEloMultiplier('gilet-pare-balles')).toBe(1);
    expect(jokerEloMultiplier(null)).toBe(1);
  });
});

describe('applyJokerToVariation', () => {
  it('null = arrondi simple (identité d’effet)', () => {
    expect(applyJokerToVariation(12.4, null)).toBe(12);
    expect(applyJokerToVariation(-12.6, null)).toBe(-13);
  });

  it('Caféine ×2 sur gain ET perte, arrondi APRÈS multiplication', () => {
    // round(2 × 6.3) = round(12.6) = 13 ≠ 2 × round(6.3)=12
    expect(applyJokerToVariation(6.3, 'cafeine')).toBe(13);
    expect(applyJokerToVariation(-6.3, 'cafeine')).toBe(-13);
  });

  it('Dopage ×3 sur gain ET perte', () => {
    expect(applyJokerToVariation(5, 'dopage')).toBe(15);
    expect(applyJokerToVariation(-5, 'dopage')).toBe(-15);
  });

  it('Gilet : perte ramenée à 0, gain inchangé', () => {
    expect(applyJokerToVariation(-8.5, 'gilet-pare-balles')).toBe(0);
    expect(applyJokerToVariation(8.5, 'gilet-pare-balles')).toBe(9);
  });
});

describe('applyJokerToBonus', () => {
  it('Seconde chance au 2e essai → moitié (arrondi)', () => {
    expect(applyJokerToBonus(45, 'seconde-chance', true)).toBe(23); // round(22.5)
    expect(applyJokerToBonus(45, 'seconde-chance', false)).toBe(45); // 1er essai : plein
  });

  it('Caféine/Dopage/null n’affectent pas le bonus', () => {
    expect(applyJokerToBonus(40, 'cafeine', false)).toBe(40);
    expect(applyJokerToBonus(40, 'dopage', true)).toBe(40);
    expect(applyJokerToBonus(40, null, true)).toBe(40);
  });
});

describe('effectiveBattleScore', () => {
  it('Fourbe : +1 ssi la question doublée est correcte', () => {
    expect(effectiveBattleScore(7, { active: true, slotCorrect: true })).toBe(8);
    expect(effectiveBattleScore(7, { active: true, slotCorrect: false })).toBe(7);
    expect(effectiveBattleScore(7, { active: false, slotCorrect: true })).toBe(7);
  });
});

describe('isJokerUsableInScope (bornes)', () => {
  it('un joker solo est refusé en bataille et inversement', () => {
    expect(isJokerUsableInScope('cafeine', 'solo')).toBe(true);
    expect(isJokerUsableInScope('cafeine', 'battle')).toBe(false);
    expect(isJokerUsableInScope('fourbe', 'battle')).toBe(true);
    expect(isJokerUsableInScope('fourbe', 'solo')).toBe(false);
  });

  it('une conversion ou un id inconnu n’est jamais « jouable »', () => {
    expect(isJokerUsableInScope('balle-dans-le-pied', 'solo')).toBe(false);
    expect(isJokerUsableInScope('inconnu', 'solo')).toBe(false);
    expect(isJokerUsableInScope(null, 'solo')).toBe(false);
  });
});
