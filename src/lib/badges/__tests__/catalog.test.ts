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
  rank: null,
  themes: [],
};

// Tous les thèmes maîtrisés au niveau or → débloque les 30 badges de thème + les 6 multi-thèmes.
const ALL_THEMES_MASTERED = [
  'Animaux et plantes',
  'Classique',
  'Culture générale',
  'Géographie',
  'Histoire',
  'Jeux-vidéo / Culture Web',
  'Moderne',
  'Musiques',
  'Sciences',
  'Sport',
].map((theme) => ({ theme, answered: 100, correct: 100, successRate: 100 }));

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
      rank: 1, // nº 1 → débloque les 3 badges Podium
      themes: ALL_THEMES_MASTERED,
    };
    // « ça arrive » exige une mauvaise réponse (answered - correct >= 1), absente ici.
    expect(BADGES.filter((b) => !b.test(HIGH)).map((b) => b.id)).toEqual(['ca-arrive']);
  });
});

describe('podium', () => {
  const get = (id: string) => {
    const b = BADGES.find((x) => x.id === id);
    if (!b) throw new Error(`badge introuvable: ${id}`);
    return b;
  };

  it('rang null (hors classement / admin) → aucun badge podium', () => {
    expect(get('podium').test({ ...ZERO, rank: null })).toBe(false);
    expect(get('vice-champion').test({ ...ZERO, rank: null })).toBe(false);
    expect(get('numero-un').test({ ...ZERO, rank: null })).toBe(false);
  });

  it('seuils de rang (nichés)', () => {
    expect(get('podium').test({ ...ZERO, rank: 4 })).toBe(false);
    expect(get('podium').test({ ...ZERO, rank: 3 })).toBe(true);
    expect(get('vice-champion').test({ ...ZERO, rank: 3 })).toBe(false);
    expect(get('vice-champion').test({ ...ZERO, rank: 2 })).toBe(true);
    expect(get('numero-un').test({ ...ZERO, rank: 2 })).toBe(false);
    expect(get('numero-un').test({ ...ZERO, rank: 1 })).toBe(true);
  });

  it('être nº 1 débloque les 3 badges podium', () => {
    const s = { ...ZERO, rank: 1 };
    expect([get('podium'), get('vice-champion'), get('numero-un')].every((b) => b.test(s))).toBe(true);
  });
});
