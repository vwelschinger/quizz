'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminTitle } from '../AdminChrome';

interface LoginEvent {
  id: number;
  username: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}
interface ActiveUser {
  id: number;
  username: string;
  lastSeen: string | null;
}

const ACTIVE_WINDOW_MIN = 15;

function fmt(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}
function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const h = Math.round(mins / 60);
  return `il y a ${h} h`;
}

export default function ConnexionsAdmin() {
  const [logins, setLogins] = useState<LoginEvent[]>([]);
  const [active, setActive] = useState<ActiveUser[]>([]);

  const refresh = useCallback(async () => {
    const [l, u] = await Promise.all([
      fetch('/api/admin/logins').then((r) => r.json()),
      fetch('/api/admin/users/detailed').then((r) => r.json()),
    ]);
    setLogins(l.logins ?? []);
    const cutoff = Date.now() - ACTIVE_WINDOW_MIN * 60000;
    const act = (u.users ?? [])
      .filter((x: ActiveUser) => x.lastSeen && new Date(x.lastSeen).getTime() >= cutoff)
      .sort((a: ActiveUser, b: ActiveUser) => (b.lastSeen ?? '').localeCompare(a.lastSeen ?? ''));
    setActive(act);
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30000); // rafraîchit l'activité en direct
    return () => clearInterval(t);
  }, [refresh]);

  return (
    <main className="mx-auto w-full max-w-[700px] px-[18px] pb-[42px] pt-[60px] text-cream">
      <AdminTitle title="CONNEXIONS" />

      {/* Actifs récemment (mis à jour dès qu'un joueur fait une action) */}
      <section className="adm-panel adm-panel--flush">
        <div className="adm-panel-head adm-panel-head--pad">
          <span>ACTIFS · {active.length}</span>
          <span className="text-[10px] font-semibold text-[#79705f]">≤ {ACTIVE_WINDOW_MIN} min</span>
        </div>
        {active.length === 0 ? (
          <p className="px-[15px] pb-3 text-[12px] text-[#79705f]">Personne d&apos;actif en ce moment.</p>
        ) : (
          <div className="flex flex-wrap gap-2 px-[15px] pb-3">
            {active.map((a) => (
              <span key={a.id} className="flex items-center gap-2 border border-admin-border px-2 py-1 text-[12px]">
                <span className="h-2 w-2 rounded-full bg-[#4ccf85]" />
                <span className="font-bold text-cream">{a.username}</span>
                <span className="text-[#79705f]">{a.lastSeen ? ago(a.lastSeen) : ''}</span>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Journal des connexions */}
      <section className="adm-panel adm-panel--flush">
        <div className="adm-panel-head adm-panel-head--pad">
          <span>CONNEXIONS RÉCENTES · {logins.length}</span>
        </div>
        {logins.length === 0 ? (
          <p className="px-[15px] pb-3 text-[12px] text-[#79705f]">Aucune connexion enregistrée.</p>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Pseudo</th>
                <th>Date</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logins.map((l) => (
                <tr key={l.id}>
                  <td className="adm-td-name">{l.username}</td>
                  <td className="text-[11px] text-[#c7bda8]">{fmt(l.createdAt)}</td>
                  <td className="text-[11px] text-[#c7bda8]">{l.ip ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
