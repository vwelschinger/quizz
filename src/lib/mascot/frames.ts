// Module mascotte — VERSION À JOUR (livrée avec les frames design, cf. DIRECTIVES.md).
// Changements vs SPEC_CODE_MASCOTTE.md §4.1 :
//   • `correct` ralenti : 12 → 8 fps. `wrong` ralenti : 10 → 7 fps.
//   • 4 nouveaux états en BOUCLE : `bataille`, `victoire`, `defaite`, `matchnul` (post-bataille).
//     Ils ne retombent pas seuls sur `idle` (loop:true) — repasser à `idle` quand l'écran se ferme.
// Contrat inchangé : clés des 5 états d'origine, chemins de fichiers, framePath(), advance(), bus.

export type MascotState =
  | 'idle'
  | 'thinking'
  | 'correct'
  | 'wrong'
  | 'badge'
  | 'bataille'
  | 'victoire'
  | 'defaite'
  | 'matchnul';

export interface FrameSpec {
  frames: number;
  fps: number;
  loop: boolean;
}

export const MASCOT_FRAMES: Record<MascotState, FrameSpec> = {
  idle: { frames: 4, fps: 4, loop: true },
  thinking: { frames: 4, fps: 5, loop: true }, // Bob dort (ZZZ)
  correct: { frames: 6, fps: 8, loop: false }, // drapeau + danse — ralenti
  wrong: { frames: 5, fps: 7, loop: false }, // faucille + marteau — ralenti
  badge: { frames: 6, fps: 12, loop: false }, // présente un badge en main
  bataille: { frames: 4, fps: 6, loop: true }, // casque + couteau (boucle)
  victoire: { frames: 6, fps: 8, loop: true }, // post-bataille — casque, danse, 2 couteaux
  defaite: { frames: 4, fps: 4, loop: true }, // post-bataille — casque, K.O., yeux en croix, langue
  matchnul: { frames: 4, fps: 4, loop: true }, // post-bataille — casque, blasé
};

/** Chemin d'une frame : `/mascotte/<état>/<état>-NN.svg` (NN sur 2 chiffres dès 01). */
export const framePath = (s: MascotState, i: number): string =>
  `/mascotte/${s}/${s}-${String(i + 1).padStart(2, '0')}.svg`;

/**
 * Logique pure (testable sans DOM) : frame suivante + faut-il retomber sur `idle` ?
 * Les états `loop:true` (idle/thinking/bataille/victoire/defaite/matchnul) ne signalent jamais `done`.
 */
export function advance(s: MascotState, frame: number): { frame: number; done: boolean } {
  const { frames, loop } = MASCOT_FRAMES[s];
  const next = frame + 1;
  if (next < frames) return { frame: next, done: false };
  return loop ? { frame: 0, done: false } : { frame: frames - 1, done: true };
}
