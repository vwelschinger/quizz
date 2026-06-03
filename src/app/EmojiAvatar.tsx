'use client';

import { useEffect, useState } from 'react';

const EMOJIS = ['😎', '🔥', '🚀', '⚡️', '🦊', '🐺', '🦅', '🎯', '🧠', '⭐️', '🏆', '👊', '🐉', '🦁', '🌟', '💪'];

export default function EmojiAvatar() {
  const [emoji, setEmoji] = useState('🦊');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem('revorun-emoji');
      if (v) setEmoji(v);
    } catch {
      /* localStorage indisponible */
    }
  }, []);

  function pick(value: string) {
    setEmoji(value);
    setOpen(false);
    try {
      localStorage.setItem('revorun-emoji', value);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Choisir ton blason"
        className="press-blue relative flex h-[60px] w-[60px] items-center justify-center border-[3px] border-ink bg-card text-[30px] leading-none"
      >
        <span>{emoji}</span>
        <span className="absolute -bottom-2 -right-2 flex h-[22px] w-[22px] items-center justify-center border-2 border-card bg-ink text-[11px] text-cream">
          ✎
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-[70px] z-[41] w-[252px] border-[3px] border-ink bg-card p-[14px] shadow-pop">
            <div className="mb-[10px] text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink-2">
              Choisis ton blason
            </div>
            <div className="grid grid-cols-4 gap-[6px]">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => pick(e)}
                  className={`flex aspect-square items-center justify-center border-2 text-[24px] transition ${
                    e === emoji
                      ? 'border-brand bg-brand-soft shadow-[2px_2px_0_#1e6499]'
                      : 'border-transparent bg-paper hover:border-ink'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
