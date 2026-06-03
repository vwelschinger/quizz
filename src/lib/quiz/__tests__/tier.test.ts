import { describe, it, expect } from 'vitest';
import { playerTier } from '../tier';

describe('playerTier', () => {
  it('classe selon le palier', () => {
    expect(playerTier(50).name).toBe('NOVICE');
    expect(playerTier(1240).name).toBe('CONFIRMÉ');
    expect(playerTier(1450).name).toBe('EXPERT');
  });

  it('calcule la progression vers le palier suivant', () => {
    expect(playerTier(1200).progress).toBe(0);
    expect(playerTier(1300).progress).toBe(50);
  });

  it('dernier palier : next null et progression 100 %', () => {
    const t = playerTier(2000);
    expect(t.next).toBeNull();
    expect(t.progress).toBe(100);
  });
});
