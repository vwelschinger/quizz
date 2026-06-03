import { describe, it, expect } from 'vitest';
import { bonusPoints, questionLabel, categoryLabel, difficultyLabel } from '../scoring';

describe('bonusPoints', () => {
  it('= 100 - taux de réussite pour une bonne réponse', () => {
    expect(bonusPoints(30, true)).toBe(70);
    expect(bonusPoints(0, true)).toBe(100);
    expect(bonusPoints(100, true)).toBe(0);
  });

  it('= 0 pour une mauvaise réponse', () => {
    expect(bonusPoints(30, false)).toBe(0);
  });

  it('arrondit et borne le taux', () => {
    expect(bonusPoints(33.4, true)).toBe(67);
    expect(bonusPoints(150, true)).toBe(0);
  });
});

describe('labels', () => {
  it('formate "Catégorie - Difficulté"', () => {
    expect(questionLabel('expert', 'high')).toBe('Expert - High');
    expect(questionLabel('abordable', 'low')).toBe('Abordable - Low');
  });

  it('expose les labels unitaires', () => {
    expect(categoryLabel('abordable')).toBe('Abordable');
    expect(difficultyLabel('middle')).toBe('Middle');
  });
});
