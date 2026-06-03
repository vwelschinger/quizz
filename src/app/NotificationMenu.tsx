'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

interface Notif {
  id: number;
  kind: string;
  prompt: string | null;
  eloDelta: number;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const TITLES: Record<string, string> = {
  contest_accepted: '✓ Contestation acceptée',
  contest_rejected: '✗ Contestation refusée',
  battle_challenge: '⚔️ Défi en bataille',
  battle_finished: '⚔️ Bataille terminée',
  battle_recomputed: '↻ Bataille recalculée',
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  if (j < 7) return `il y a ${j} j`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function NotificationMenu() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  function load() {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((d) => {
        setNotifs(d.notifications ?? []);
        setUnread(d.unreadCount ?? 0);
      })
      .catch(() => {});
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      setNotifs((ns) => ns.map((n) => ({ ...n, read: true })));
      fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }).catch(() => {});
    }
  }

  function del(id: number) {
    setNotifs((ns) => ns.filter((n) => n.id !== id));
    fetch(`/api/notifications/${id}`, { method: 'DELETE' }).catch(() => {});
  }

  function delAll() {
    setNotifs([]);
    setUnread(0);
    fetch('/api/notifications', { method: 'DELETE' }).catch(() => {});
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        className="relative flex h-[44px] w-[44px] items-center justify-center border-[3px] border-ink bg-card shadow-hard"
        aria-label="Notifications"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-2 -top-2 flex h-[22px] min-w-[22px] items-center justify-center rounded-full border-2 border-paper bg-fail px-1 font-sans text-[11px] font-bold leading-none text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[300px] border-[3px] border-ink bg-paper shadow-hard-lg">
          <div className="flex items-center justify-between border-b-2 border-ink px-3 py-2">
            <span className="font-disp text-[14px] uppercase tracking-disp">Notifications</span>
            {notifs.length > 0 && (
              <button onClick={delAll} className="text-[11px] font-semibold text-ink-2 underline">
                Tout effacer
              </button>
            )}
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="px-3 py-6 text-center text-[12px] text-ink-3">Aucune notification</div>
            ) : (
              notifs.map((n) => {
                const body = (
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-bold leading-snug">
                      {TITLES[n.kind] ?? 'Notification'}
                      {n.eloDelta !== 0 && (
                        <span className={`ml-1.5 ${n.eloDelta > 0 ? 'text-success' : 'text-fail'}`}>
                          {n.eloDelta > 0 ? `+${n.eloDelta}` : n.eloDelta} ELO
                        </span>
                      )}
                    </div>
                    {n.prompt && (
                      <div className="mt-0.5 text-[12px] leading-snug text-ink-2">{n.prompt}</div>
                    )}
                    <div className="mt-1 text-[10px] text-ink-3">{fmtTime(n.createdAt)}</div>
                  </div>
                );
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-2 border-b border-[#e4dac6] px-3 py-2 ${
                      n.read ? '' : 'bg-brand-soft'
                    }`}
                  >
                    {n.link ? (
                      <Link href={n.link} className="min-w-0 flex-1" onClick={() => setOpen(false)}>
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                    <button
                      onClick={() => del(n.id)}
                      className="shrink-0 text-[14px] leading-none text-ink-3 hover:text-ink"
                      aria-label="Effacer"
                    >
                      ✕
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
