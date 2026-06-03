import { describe, it, expect } from 'vitest';
import { isAnswerCorrect } from '../answer';

describe('isAnswerCorrect', () => {
  it('accepte la réponse canonique et ses variantes (accents/casse)', () => {
    const accepted = ['4', 'Quatre', 'quatres'];
    expect(isAnswerCorrect(accepted, '4')).toBe(true);
    expect(isAnswerCorrect(accepted, 'quatre')).toBe(true);
    expect(isAnswerCorrect(accepted, 'QUATRE')).toBe(true);
    expect(isAnswerCorrect(accepted, 'Sydney')).toBe(false);
  });

  it('ignore les accents', () => {
    expect(isAnswerCorrect(['Pythagore'], 'pythagoré')).toBe(true);
    expect(isAnswerCorrect(['Égalité'], 'egalite')).toBe(true);
  });

  it('refuse une réponse vide', () => {
    expect(isAnswerCorrect(['Canberra'], '')).toBe(false);
    expect(isAnswerCorrect(['Canberra'], '   ')).toBe(false);
  });
});
