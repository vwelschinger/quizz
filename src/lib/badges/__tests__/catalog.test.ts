import { describe, it, expect } from 'vitest';
import { BADGES, type UserBadgeStats } from '../catalog';

const ZERO: UserBadgeStats = {
  answered: 0,
  correct: 0,
  successRate: 0,
  bestStreak: 0,
  elo: 0,
  expertCorrect: 0,
  hardCorrect: 0,
  distinctDays: 0,
  dailyStreak: 0,
  battlesPlayed: 0,
  battlesWon: 0,
  battleLosses: 0,
  bestBattleStreak: 0,
  perfectBattles: 0,
  beatHigherElo: false,
  facedHigherElo: false,
  beatAdmin: false,
  maxWinsVsOpponent: 0,
  maxLossesVsOpponent: 0,
  contestationsAccepted: 0,
  contestationsTotal: 0,
  themeMastered: false,
  nightOwl: false,
  weekendWarrior: false,
};

describe('catalogue des badges', () => {
  it('a des identifiants uniques', () => {
    const ids = BADGES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("n'attribue rien (et ne lève pas) avec des stats à zéro", () => {
    for (const b of BADGES) expect(() => b.test(ZERO)).not.toThrow();
    expect(BADGES.filter((b) => b.test(ZERO))).toEqual([]);
  });

  it('débloque tout (sauf « ça arrive ») avec des stats maximales', () => {
    const HIGH: UserBadgeStats = {
      ...ZERO,
      answered: 1000,
      correct: 1000,
      successRate: 100,
      bestStreak: 50,
      elo: 1800,
      expertCorrect: 50,
      hardCorrect: 10,
      distinctDays: 30,
      dailyStreak: 7,
      battlesPlayed: 10,
      battlesWon: 50,
      battleLosses: 25,
      bestBattleStreak: 5,
      perfectBattles: 1,
      beatHigherElo: true,
      facedHigherElo: true,
      beatAdmin: true,
      maxWinsVsOpponent: 3,
      maxLossesVsOpponent: 3,
      contestationsAccepted: 10,
      contestationsTotal: 5,
      themeMastered: true,
      nightOwl: true,
      weekendWarrior: true,
    };
    // « ça arrive » exige une mauvaise réponse (answered - correct >= 1), absente ici.
    expect(BADGES.filter((b) => !b.test(HIGH)).map((b) => b.id)).toEqual(['ca-arrive']);
  });
});
