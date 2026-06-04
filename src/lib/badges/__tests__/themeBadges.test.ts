import { describe, it, expect } from 'vitest';
import { THEME_BADGES, MULTI_THEME_BADGES } from '../themeBadges';
import type { ThemeStat, UserBadgeStats } from '../catalog';

const t = (theme: string, answered: number, rate: number): ThemeStat => ({
  theme,
  answered,
  correct: Math.round((answered * rate) / 100),
  successRate: rate,
});
const stats = (themes: ThemeStat[]) => ({ themes }) as unknown as UserBadgeStats;
const badge = (id: string) => [...THEME_BADGES, ...MULTI_THEME_BADGES].find((b) => b.id === id)!;

describe('badges par thème', () => {
  it('bronze = 10 réponses ET 50 %', () => {
    expect(badge('theme-histoire-1').test(stats([t('Histoire', 10, 50)]))).toBe(true);
    expect(badge('theme-histoire-1').test(stats([t('Histoire', 9, 99)]))).toBe(false); // volume
    expect(badge('theme-histoire-1').test(stats([t('Histoire', 30, 49)]))).toBe(false); // %
  });
  it('or = 50 réponses ET 85 %', () => {
    expect(badge('theme-histoire-3').test(stats([t('Histoire', 50, 85)]))).toBe(true);
    expect(badge('theme-histoire-3').test(stats([t('Histoire', 50, 84)]))).toBe(false);
  });
  it('un autre thème ne débloque pas Histoire', () => {
    expect(badge('theme-histoire-1').test(stats([t('Sport', 100, 100)]))).toBe(false);
  });
});

describe('badges multi-thèmes', () => {
  const many = (n: number, rate = 100, ans = 1) =>
    Array.from({ length: n }, (_, i) => t(`T${i}`, ans, rate));

  it('tous-azimuts = ≥ 10 thèmes joués', () => {
    expect(badge('tous-azimuts').test(stats(many(10)))).toBe(true);
    expect(badge('tous-azimuts').test(stats(many(9)))).toBe(false);
  });
  it('couteau suisse = bronze dans ≥ 3 thèmes', () => {
    expect(badge('polyvalent').test(stats(many(3, 60, 10)))).toBe(true);
    expect(badge('polyvalent').test(stats(many(2, 60, 10)))).toBe(false);
  });
  it('funambule = ≥ 5 thèmes (≥10 rép) tous ≥ 60 %', () => {
    expect(badge('equilibriste').test(stats(many(5, 60, 10)))).toBe(true);
    const bad = [...many(4, 80, 10), t('T4', 12, 55)]; // un thème "sérieux" à 55 %
    expect(badge('equilibriste').test(stats(bad))).toBe(false);
    expect(badge('equilibriste').test(stats(many(4, 90, 10)))).toBe(false); // pas assez de thèmes
  });
});
