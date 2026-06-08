import type { MascotState } from './frames';

// Bus d'évènements DOM « fire-and-forget » : n'importe quel code client peut faire réagir Bob,
// et le composant Mascotte s'y abonne. Pas de state global.

const EVENT = 'qag:mascot';

/** À appeler depuis n'importe où côté client pour faire réagir Bob. */
export function mascotReact(state: MascotState): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { state } }));
}

/** Abonnement (utilisé par le composant). Renvoie une fonction de désabonnement. */
export function onMascot(cb: (state: MascotState) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => cb((e as CustomEvent<{ state: MascotState }>).detail.state);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
