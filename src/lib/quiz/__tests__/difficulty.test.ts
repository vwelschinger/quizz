import { describe, it, expect } from 'vitest';
import { difficultyFromSuccessRate, clampPercent } from '../difficulty';

describe('difficultyFromSuccessRate', () => {
  it('High pour un taux de réussite faible (<= 33 %)', () => {
    expect(difficultyFromSuccessRate(0)).toBe('high');
    expect(difficultyFromSuccessRate(33)).toBe('high');
  });

  it('Middle pour un taux moyen (34-66 %)', () => {
    expect(difficultyFromSuccessRate(34)).toBe('middle');
    expect(difficultyFromSuccessRate(66)).toBe('middle');
  });

  it('Low pour un taux élevé (>= 67 %)', () => {
    expect(difficultyFromSuccessRate(67)).toBe('low');
    expect(difficultyFromSuccessRate(100)).toBe('low');
  });

  it('borne les valeurs hors [0, 100]', () => {
    expect(clampPercent(-10)).toBe(0);
    expect(clampPercent(150)).toBe(100);
    expect(difficultyFromSuccessRate(-5)).toBe('high');
    expect(difficultyFromSuccessRate(120)).toBe('low');
  });
});
