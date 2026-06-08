'use client';

import { useEffect, useState } from 'react';
import { MASCOT_ENABLED, MASCOT_FRAMES, framePath, advance, type MascotState } from '@/lib/mascot/frames';
import { onMascot } from '@/lib/mascot/bus';

const STATIC = '/mascotte/bob-static.svg';

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduce(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduce;
}

export default function Mascotte({ size = 96, className = '' }: { size?: number; className?: string }) {
  const [state, setState] = useState<MascotState>('idle');
  const [frame, setFrame] = useState(0);
  const reduce = usePrefersReducedMotion();

  // 1) Précharge toutes les frames (évite le clignotement au 1er déclenchement).
  useEffect(() => {
    if (!MASCOT_ENABLED) return;
    (Object.keys(MASCOT_FRAMES) as MascotState[]).forEach((s) => {
      for (let i = 0; i < MASCOT_FRAMES[s].frames; i++) {
        const img = new Image();
        img.src = framePath(s, i);
      }
    });
  }, []);

  // 2) Écoute les évènements du jeu.
  useEffect(() => onMascot(setState), []);

  // 3) Boucle d'animation. Les états non-bouclés retombent sur 'idle' une fois finis.
  useEffect(() => {
    if (!MASCOT_ENABLED) return;
    if (reduce) {
      setFrame(0);
      return;
    }
    setFrame(0);
    let current = 0;
    const id = window.setInterval(() => {
      const { frame: next, done } = advance(state, current);
      current = next;
      setFrame(next);
      if (done) {
        window.clearInterval(id);
        setState('idle');
      }
    }, 1000 / MASCOT_FRAMES[state].fps);
    return () => window.clearInterval(id);
  }, [state, reduce]);

  // Masqué tant que les assets ne sont pas livrés (flag dans frames.ts).
  if (!MASCOT_ENABLED) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={reduce ? STATIC : framePath(state, frame)}
      alt="Bob le ragondin"
      width={size}
      height={size}
      className={`mascotte select-none ${className}`}
      draggable={false}
      aria-hidden
      onError={(e) => {
        // Repli si une frame manque (ex. assets partiellement livrés).
        if (e.currentTarget.src.indexOf(STATIC) === -1) e.currentTarget.src = STATIC;
      }}
    />
  );
}
