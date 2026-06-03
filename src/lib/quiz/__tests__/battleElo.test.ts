import { describe, it, expect } from 'vitest';
import { battleEloOutcome } from '../battleElo';

describe('battleEloOutcome', () => {
  it('à ELO égal : +16 / -16 (K=32)', () => {
    const r = battleEloOutcome(1200, 1200, 5, 3);
    expect(r.deltaA).toBe(16);
    expect(r.deltaB).toBe(-16);
    expect(r.outcome).toBe('a');
  });

  it('match nul : 0 / 0', () => {
    const r = battleEloOutcome(1200, 1200, 4, 4);
    expect(r.deltaA).toBe(0);
    expect(r.deltaB).toBe(0);
    expect(r.outcome).toBe('draw');
  });

  it('battre plus fort que soi rapporte davantage', () => {
    const r = battleEloOutcome(1200, 1600, 5, 4);
    expect(r.outcome).toBe('a');
    expect(r.deltaA).toBeGreaterThan(16);
  });

  it('somme nulle (zero-sum) sur des valeurs sans arrondi limite', () => {
    const r = battleEloOutcome(1300, 1100, 2, 5);
    expect(r.deltaA + r.deltaB).toBe(0);
    expect(r.outcome).toBe('b');
  });
});
