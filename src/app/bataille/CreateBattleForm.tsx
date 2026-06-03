'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateBattleForm() {
  const router = useRouter();
  const [opponent, setOpponent] = useState('');
  const [size, setSize] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/battles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opponent: opponent.trim(), size }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Création impossible');
        return;
      }
      router.push(`/bataille/${data.battleId}`);
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card-hard p-4">
      <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-2">
        Défier un joueur
      </div>
      <div className="flex gap-2">
        <input
          value={opponent}
          onChange={(e) => setOpponent(e.target.value)}
          placeholder="Pseudo de l'adversaire"
          required
          className="h-[48px] min-w-0 flex-1 border-[3px] border-ink bg-paper px-3 font-sans text-[15px] font-semibold outline-none focus:shadow-[4px_4px_0_#1e6499]"
        />
        <select
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          className="h-[48px] border-[3px] border-ink bg-paper px-2 font-disp text-[16px]"
          aria-label="Nombre de questions"
        >
          {[3, 5, 10].map((n) => (
            <option key={n} value={n}>
              {n} Q
            </option>
          ))}
        </select>
      </div>
      {error && <p className="mt-2 text-[13px] font-semibold text-fail">{error}</p>}
      <button type="submit" disabled={loading} className="cta-primary mt-3">
        {loading ? '…' : 'Lancer le défi'}
      </button>
    </form>
  );
}
