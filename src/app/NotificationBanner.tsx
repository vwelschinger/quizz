'use client';

import { useEffect, useState } from 'react';

interface Notif {
  id: number;
  kind: string;
  prompt: string | null;
  eloDelta: number;
}

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
        const accepted = n.kind === 'contest_accepted';
        return (
          <div
            key={n.id}
            className={`flex items-start gap-2 border-[3px] border-ink p-3 shadow-hard ${
              accepted ? 'bg-success-soft' : 'bg-card'
            }`}
          >
            <div className="min-w-0 flex-1 text-[13px]">
              <div className="font-bold">
                {accepted ? '✓ Contestation acceptée' : '✗ Contestation refusée'}
                {accepted && n.eloDelta !== 0 && (
                  <span className="ml-2 text-success">
                    +{n.eloDelta} ELO
                  </span>
                )}
              </div>
              {n.prompt && <div className="mt-1 text-ink-2">{n.prompt}</div>}
            </div>
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
