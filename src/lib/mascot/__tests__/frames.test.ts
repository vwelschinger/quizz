import { describe, it, expect } from 'vitest';
import { advance, MASCOT_FRAMES, framePath, type MascotState } from '../frames';

describe('advance', () => {
  it('boucle sur idle sans jamais signaler done', () => {
    let f = 0;
    for (let i = 0; i < MASCOT_FRAMES.idle.frames * 3; i++) {
      const r = advance('idle', f);
      f = r.frame;
      expect(r.done).toBe(false);
    }
  });

  it('correct joue une fois puis signale done sur la dernière frame', () => {
    const n = MASCOT_FRAMES.correct.frames;
    let f = 0;
    let done = false;
    for (let i = 0; i < n - 1; i++) {
      const r = advance('correct', f);
      f = r.frame;
      done = r.done;
    }
    expect(done).toBe(false); // pas encore fini
    expect(advance('correct', f).done).toBe(true); // fin → retombe sur idle
  });

  it('les états non bouclés finissent sur leur dernière frame', () => {
    for (const s of ['correct', 'wrong', 'badge'] as MascotState[]) {
      const n = MASCOT_FRAMES[s].frames;
      const r = advance(s, n - 1);
      expect(r).toEqual({ frame: n - 1, done: true });
    }
  });

  it('chemin de fichier : NN sur 2 chiffres', () => {
    expect(framePath('badge', 2)).toBe('/mascotte/badge/badge-03.svg');
    expect(framePath('idle', 0)).toBe('/mascotte/idle/idle-01.svg');
  });
});
