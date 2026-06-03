'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ChallengeButton({ opponent }: { opponent: string }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function challenge() {
    if (state === 'sending') return;
    setState('sending');
    try {
      const res = await fetch('/api/battles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opponent }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.battleId) {
        router.push(`/bataille/${data.battleId}`);
        return;
      }
      setMsg(data.error ?? 'Échec du défi');
      setState('error');
    } catch {
      setMsg('Erreur réseau');
      setState('error');
    }
  }

  const err = state === 'error';
  return (
    <button
      onClick={challenge}
      disabled={state === 'sending'}
      title={err ? msg : `Provoquer ${opponent} en duel`}
      aria-label={`Provoquer ${opponent} en duel`}
      className={`flex w-[52px] shrink-0 flex-col items-center justify-center gap-[2px] border-[2px] border-ink px-2 py-[6px] text-cream shadow-hard disabled:opacity-60 ${
        err ? 'bg-fail' : 'bg-brand'
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
      </svg>
      <span className="font-disp text-[9px] uppercase leading-none tracking-disp">
        {state === 'sending' ? '…' : err ? '!' : 'Duel'}
      </span>
    </button>
  );
}
