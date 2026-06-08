'use client';

import { useState } from 'react';

/**
 * Popup d'explication des jokers. `autoOpen` : s'ouvre d'emblée (1re visite). `withButton` : affiche
 * un bouton « ? » pour la rouvrir. Fermer marque le drapeau `seen_jokers_intro` côté serveur.
 */
export default function JokersIntro({
  autoOpen = false,
  withButton = false,
}: {
  autoOpen?: boolean;
  withButton?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);

  async function dismiss() {
    setOpen(false);
    try {
      await fetch('/api/jokers/seen-intro', { method: 'POST' });
    } catch {
      /* sans gravité : le drapeau sera retenté à la prochaine ouverture */
    }
  }

  return (
    <>
      {withButton && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="À quoi servent les jokers ?"
          className="flex h-9 w-9 items-center justify-center border-[3px] border-ink bg-card font-disp text-[18px] leading-none shadow-hard"
        >
          ?
        </button>
      )}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5"
          onClick={dismiss}
        >
          <div
            className="w-full max-w-[400px] border-[3px] border-ink bg-paper p-5 shadow-hard-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-deep">
              Nouveau
            </div>
            <h2 className="font-disp text-[30px] uppercase leading-[0.9] tracking-disp">Les jokers</h2>
            <p className="mt-3 text-[13px] leading-snug text-ink-2">
              Tes bonnes réponses te rapportent des <b>Kopecks</b>, la monnaie du jeu. Dépense-les pour
              acheter des <b>jokers</b>, garde-les en réserve, puis <b>active-les en partie</b> pour
              renverser le cours d’une question ou d’un duel.
            </p>
            <ul className="mt-3 space-y-2 text-[12px] leading-snug">
              <li>
                <span className="font-bold uppercase tracking-[0.06em] text-fail">Offensif</span> —
                multiplie tes gains d’ELO, prends des risques calculés.
              </li>
              <li>
                <span className="font-bold uppercase tracking-[0.06em] text-ink">Défensif</span> —
                absorbe une perte, passe une question, tente un 2e essai.
              </li>
              <li>
                <span className="font-bold uppercase tracking-[0.06em] text-brand-deep">
                  Utilitaire
                </span>{' '}
                — convertis ELO ↔ Kopecks, recycle tes jokers en trop.
              </li>
            </ul>
            <button onClick={dismiss} className="cta-primary mt-5">
              Compris
            </button>
          </div>
        </div>
      )}
    </>
  );
}
