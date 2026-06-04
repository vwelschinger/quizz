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
  it('mappe la combinaison catégorie + difficulté sur l’échelle 1-6', () => {
    expect(questionLabel('abordable', 'low')).toBe('Très Facile - 1/6');
    expect(questionLabel('abordable', 'middle')).toBe('Facile - 2/6');
    expect(questionLabel('abordable', 'high')).toBe('Moyenne - 3/6');
    expect(questionLabel('expert', 'low')).toBe('Difficile - 4/6');
    expect(questionLabel('expert', 'middle')).toBe('Très Difficile - 5/6');
    expect(questionLabel('expert', 'high')).toBe('Démoniaque - 6/6');
  });

  it('expose les labels unitaires', () => {
    expect(categoryLabel('abordable')).toBe('Abordable');
    expect(difficultyLabel('middle')).toBe('Middle');
  });
});
