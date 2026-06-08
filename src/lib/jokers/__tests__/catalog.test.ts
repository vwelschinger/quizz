import { describe, it, expect } from 'vitest';
import { JOKERS, getJoker, jokerPrice, nextJokerPrice } from '../catalog';

const CONSUMABLES = ['esquive', 'gilet-pare-balles', 'cafeine', 'seconde-chance', 'fourbe', 'dopage'];
const CONVERSIONS = ['balle-dans-le-pied', 'recyclage'];

describe('catalogue des jokers', () => {
  it('a des identifiants uniques', () => {
    const ids = JOKERS.map((j) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contient exactement les 6 consommables + 2 conversions gelés', () => {
    expect(JOKERS.filter((j) => j.kind === 'consumable').map((j) => j.id).sort()).toEqual(
      [...CONSUMABLES].sort(),
    );
    expect(JOKERS.filter((j) => j.kind === 'conversion').map((j) => j.id).sort()).toEqual(
      [...CONVERSIONS].sort(),
    );
  });

  it('les consommables ont un prix > 0 ; les conversions n’ont pas de prix', () => {
    for (const id of CONSUMABLES) {
      const def = getJoker(id)!;
      expect(jokerPrice(def)).toBeGreaterThan(0);
    }
    for (const id of CONVERSIONS) {
      expect(jokerPrice(getJoker(id)!)).toBeNull();
    }
  });

  it('Fourbe est le seul joker de scope bataille', () => {
    expect(JOKERS.filter((j) => j.scope === 'battle' && j.kind === 'consumable').map((j) => j.id)).toEqual(
      ['fourbe'],
    );
  });
});

describe('nextJokerPrice (prix progressif +30 %/achat, arrondi à la dizaine inférieure)', () => {
  it("suit l'exemple de la spec (base 1000)", () => {
    expect(nextJokerPrice(1000, 0)).toBe(1000);
    expect(nextJokerPrice(1000, 1)).toBe(1300);
    expect(nextJokerPrice(1000, 2)).toBe(1690);
    expect(nextJokerPrice(1000, 3)).toBe(2190); // 1000×1.3³ = 2197 → 2190
  });

  it('arrondit toujours à la dizaine inférieure', () => {
    expect(nextJokerPrice(300, 1)).toBe(390); // 390
    expect(nextJokerPrice(300, 2)).toBe(500); // 507 → 500
    expect(nextJokerPrice(120, 2)).toBe(200); // 202.8 → 200
  });
});
