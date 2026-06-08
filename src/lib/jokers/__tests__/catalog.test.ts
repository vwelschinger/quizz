import { describe, it, expect } from 'vitest';
import { JOKERS, getJoker, jokerPrice } from '../catalog';

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
