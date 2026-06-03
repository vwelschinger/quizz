import { describe, it, expect } from 'vitest';
import { expectedScore, updatePlayerElo, baseQuestionElo } from '../elo';

describe('expectedScore', () => {
  it('vaut 0.5 à ELO égal', () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5, 5);
  });

  it('augmente quand le joueur est plus fort que la question', () => {
    expect(expectedScore(1600, 1200)).toBeGreaterThan(0.5);
    expect(expectedScore(800, 1200)).toBeLessThan(0.5);
  });
});

describe('updatePlayerElo', () => {
  it('à ELO égal : +16 si correct, -16 si faux (K=32)', () => {
    expect(updatePlayerElo(1200, 1200, true).delta).toBe(16);
    expect(updatePlayerElo(1200, 1200, false).delta).toBe(-16);
  });

  it('battre une question difficile (High) rapporte plus que battre une facile', () => {
    const hard = updatePlayerElo(1200, 1600, true).delta;
    const easy = updatePlayerElo(1200, 800, true).delta;
    expect(hard).toBeGreaterThan(easy);
    expect(hard).toBe(29);
  });

  it('échouer sur une question facile (Low) coûte plus cher', () => {
    const failEasy = updatePlayerElo(1200, 800, false).delta;
    const failHard = updatePlayerElo(1200, 1600, false).delta;
    expect(failEasy).toBeLessThan(failHard);
    expect(failEasy).toBe(-29);
  });

  it('expose un before/after cohérent', () => {
    const r = updatePlayerElo(1200, 1200, true);
    expect(r.playerEloBefore).toBe(1200);
    expect(r.playerEloAfter).toBe(1216);
  });
});

describe('baseQuestionElo', () => {
  it('combine base catégorie + décalage difficulté', () => {
    expect(baseQuestionElo('expert', 'high')).toBe(1600);
    expect(baseQuestionElo('expert', 'middle')).toBe(1400);
    expect(baseQuestionElo('abordable', 'low')).toBe(800);
    expect(baseQuestionElo('abordable', 'middle')).toBe(1000);
  });
});
