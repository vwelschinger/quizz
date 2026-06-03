'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Notif {
  id: number;
  kind: string;
  prompt: string | null;
  eloDelta: number;
  link: string | null;
}

const TITLES: Record<string, string> = {
  contest_accepted: '✓ Contestation acceptée',
  contest_rejected: '✗ Contestation refusée',
  battle_challenge: '⚔️ Défi en bataille',
  battle_finished: '⚔️ Bataille terminée',
};

export default function NotificationBanner() {
  const [notifs, setNotifs] = useState<Notif[]>([]);

  useEffect(() => {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((d) => setNotifs(d.notifications ?? []))
      .catch(() => {});
  }, []);

  function dismiss(id: number) {
    setNotifs((n) => n.filter((x) => x.id !== id));
    fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    }).catch(() => {});
  }

  if (notifs.length === 0) return null;

  return (
    <div className="mb-4 flex flex-col gap-2">
      {notifs.map((n) => {
        const bg =
          n.kind === 'contest_accepted'
            ? 'bg-success-soft'
            : n.kind === 'battle_challenge'
              ? 'bg-brand-soft'
              : 'bg-card';
        const title = TITLES[n.kind] ?? 'Notification';
        const body = (
          <div className="min-w-0 flex-1 text-[13px]">
            <div className="font-bold">
              {title}
              {n.eloDelta !== 0 && (
                <span className={`ml-2 ${n.eloDelta > 0 ? 'text-success' : 'text-fail'}`}>
                  {n.eloDelta > 0 ? `+${n.eloDelta}` : n.eloDelta} ELO
                </span>
              )}
            </div>
            {n.prompt && <div className="mt-1 text-ink-2">{n.prompt}</div>}
            {n.link && (
              <div className="mt-1 text-[12px] font-semibold text-brand-deep underline">Voir →</div>
            )}
          </div>
        );
        return (
          <div
            key={n.id}
            className={`flex items-start gap-2 border-[3px] border-ink p-3 shadow-hard ${bg}`}
          >
            {n.link ? (
              <Link href={n.link} className="min-w-0 flex-1">
                {body}
              </Link>
            ) : (
              body
            )}
            <button
              onClick={() => dismiss(n.id)}
              className="shrink-0 text-[16px] leading-none text-ink-3 hover:text-ink"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
