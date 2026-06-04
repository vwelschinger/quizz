'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Opponent {
  id: number;
  username: string;
}

interface ThemeOption {
  theme: string;
  total: number;
}

export default function ThemeBattleForm({
  opponents,
  themes,
}: {
  opponents: Opponent[];
  themes: ThemeOption[];
}) {
  const router = useRouter();
  const [opponent, setOpponent] = useState('');
  const [theme, setTheme] = useState('');
  const [size, setSize] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!opponent) {
      setError('Choisis un adversaire.');
      return;
    }
    if (!theme) {
      setError('Choisis un thème.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/battles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opponent, size, theme }),
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

  if (opponents.length === 0) {
    return (
      <p className="card-hard p-4 text-[13px] text-ink-2">
        Aucun autre joueur inscrit pour l&apos;instant — invite quelqu&apos;un à rejoindre.
      </p>
    );
  }
  if (themes.length === 0) {
    return (
      <p className="card-hard p-4 text-[13px] text-ink-2">
        Aucun thème disponible — lance une synchro depuis la console admin.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card-hard p-4">
      <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-2">
        Défi sur un thème
      </div>

      <div className="flex flex-col gap-2">
        <select
          value={opponent}
          onChange={(e) => setOpponent(e.target.value)}
          required
          className="h-[48px] min-w-0 border-[3px] border-ink bg-paper px-2 font-sans text-[15px] font-semibold"
        >
          <option value="">— Adversaire —</option>
          {opponents.map((o) => (
            <option key={o.id} value={o.username}>
              {o.username}
            </option>
          ))}
        </select>

        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          required
          className="h-[48px] min-w-0 border-[3px] border-ink bg-paper px-2 font-sans text-[15px] font-semibold"
        >
          <option value="">— Thème —</option>
          {themes.map((t) => (
            <option key={t.theme} value={t.theme}>
              {t.theme} ({t.total})
            </option>
          ))}
        </select>

        <select
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          aria-label="Nombre de questions"
          className="h-[48px] border-[3px] border-ink bg-paper px-2 font-disp text-[16px]"
        >
          {[3, 5, 10].map((n) => (
            <option key={n} value={n}>
              {n} questions
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
