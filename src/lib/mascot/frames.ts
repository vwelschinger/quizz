// Manifeste des animations de Bob le ragondin. Les clés d'état et le nombre de frames sont un
// CONTRAT GELÉ partagé avec SPEC_DESIGN_MASCOTTE.md (noms de dossiers/fichiers identiques).

export type MascotState = 'idle' | 'thinking' | 'correct' | 'wrong' | 'badge';

export interface FrameSpec {
  frames: number;
  fps: number;
  loop: boolean;
}

export const MASCOT_FRAMES: Record<MascotState, FrameSpec> = {
  idle: { frames: 4, fps: 4, loop: true },
  thinking: { frames: 4, fps: 5, loop: true },
  correct: { frames: 6, fps: 12, loop: false },
  wrong: { frames: 5, fps: 10, loop: false },
  badge: { frames: 6, fps: 12, loop: false },
};

/** Chemin d'une frame : `/mascotte/<état>/<état>-NN.svg` (NN sur 2 chiffres dès 01). */
export const framePath = (s: MascotState, i: number): string =>
  `/mascotte/${s}/${s}-${String(i + 1).padStart(2, '0')}.svg`;

/** Logique pure (testable sans DOM) : frame suivante + faut-il retomber sur `idle` ? */
export function advance(s: MascotState, frame: number): { frame: number; done: boolean } {
  const { frames, loop } = MASCOT_FRAMES[s];
  const next = frame + 1;
  if (next < frames) return { frame: next, done: false };
  return loop ? { frame: 0, done: false } : { frame: frames - 1, done: true };
}
