import { describe, it, expect } from 'vitest';
import { mapGameDay, isDayComplete } from '../mapper';

// Échantillon calqué sur la structure RÉELLE de l'API (jour 98, niveau facile).
const sample = {
  serverTime: '2026-05-02T10:00:00.000Z',
  day: {
    dayNumber: 98,
    difficulty: 'facile',
    dayExpiresAt: '2026-05-02T03:00:00.000Z',
    questions: [
      {
        order: 1,
        text: 'Combien de parties compose la tétralogie de Wagner ?',
        theme: 'Classique',
        validAnswers: ['4', 'Quatre', 'quatres'],
      },
      { order: 6, text: 'Question très difficile', theme: 'Histoire', validAnswers: ['Réponse'] },
    ],
    results: {
      questionResults: {
        '1': { questionNumber: 1, percentageIncorrect: 54.0964 },
        '6': { questionNumber: 6, percentageIncorrect: 90.2405 },
      },
    },
  },
};

describe('isDayComplete', () => {
  it('vrai quand questions + stats présentes', () => {
    expect(isDayComplete(sample)).toBe(true);
  });
  it('faux sans stats ou sans questions', () => {
    expect(isDayComplete({ day: { questions: sample.day.questions, results: {} } })).toBe(false);
    expect(isDayComplete({ day: { questions: [] } })).toBe(false);
    expect(isDayComplete({})).toBe(false);
  });
});

describe('mapGameDay', () => {
  const out = mapGameDay(sample);

  it('mappe chaque question', () => {
    expect(out).toHaveLength(2);
  });
  it('compose un sourceId stable, la catégorie et la date', () => {
    expect(out[0].sourceId).toBe('facile-98-1');
    expect(out[0].category).toBe('abordable');
    expect(out[0].quizDate).toBe('2026-05-02');
  });
  it('prend validAnswers[0] comme réponse canonique + variantes', () => {
    expect(out[0].correctAnswer).toBe('4');
    expect(out[0].acceptedAnswers).toEqual(['4', 'Quatre', 'quatres']);
  });
  it('calcule le taux de réussite = 100 - percentageIncorrect', () => {
    expect(out[0].communitySuccessRate).toBeCloseTo(45.9036, 3);
    expect(out[1].communitySuccessRate).toBeCloseTo(9.7595, 3);
  });
});
