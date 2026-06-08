'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface AdminUser {
  id: number;
  username: string;
  role: 'user' | 'admin';
  elo: number;
  kopecks: number;
  loginCount: number;
  lastLogin: string | null;
  createdAt: string;
}
interface LoginEvent {
  id: number;
  username: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

function fmt(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function UsersAdmin() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logins, setLogins] = useState<LoginEvent[]>([]);
  const [eloEdits, setEloEdits] = useState<Record<number, string>>({});
  const [kopEdits, setKopEdits] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [u, l] = await Promise.all([
      fetch('/api/admin/users/detailed').then((r) => r.json()),
      fetch('/api/admin/logins').then((r) => r.json()),
    ]);
    setUsers(u.users ?? []);
    setLogins(l.logins ?? []);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function patch(id: number, payload: { elo?: number; kopecks?: number }, label: string) {
    setBusy(true);
    setNotice(null);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setNotice(data.error ?? `${label} non enregistré`);
    } else {
      await refresh();
    }
    setBusy(false);
  }

  function saveElo(u: AdminUser) {
    const raw = eloEdits[u.id];
    const value = raw === undefined ? u.elo : Math.round(Number(raw));
    if (!Number.isFinite(value)) return;
    setEloEdits((p) => {
      const n = { ...p };
      delete n[u.id];
      return n;
    });
    patch(u.id, { elo: value }, 'ELO');
  }

  function saveKopecks(u: AdminUser) {
    const raw = kopEdits[u.id];
    const value = raw === undefined ? u.kopecks : Math.round(Number(raw));
    if (!Number.isFinite(value) || value < 0) return;
    setKopEdits((p) => {
      const n = { ...p };
      delete n[u.id];
      return n;
    });
    patch(u.id, { kopecks: value }, 'Kopecks');
  }

  return (
    <main className="mx-auto w-full max-w-[760px] px-[18px] pb-[42px] pt-[60px] text-cream">
      <header className="adm-head">
        <div>
          <div className="adm-eyebrow">CONSOLE — RVR</div>
          <div className="adm-title">UTILISATEURS</div>
        </div>
        <span className="adm-env">PROD</span>
      </header>

      {notice && (
        <p className="mb-3 border-2 border-fail/40 bg-fail/10 px-3 py-2 text-[13px] text-fail">{notice}</p>
      )}

      {/* Utilisateurs : ELO + Kopecks éditables */}
      <section className="adm-panel adm-panel--flush">
        <div className="adm-panel-head adm-panel-head--pad">
          <span>GESTION · {users.length}</span>
        </div>
        <table className="adm-table">
          <thead>
            <tr>
              <th>Pseudo</th>
              <th className="ta-r">ELO</th>
              <th className="ta-r">Kopecks</th>
              <th className="ta-r">Connex.</th>
              <th className="ta-r">Dernière</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="adm-td-name">
                  {u.username}
                  {u.role === 'admin' && <span className="adm-role is-admin ml-2">admin</span>}
                </td>
                <td className="ta-r whitespace-nowrap">
                  <input
                    type="number"
                    value={eloEdits[u.id] ?? String(u.elo)}
                    onChange={(e) => setEloEdits({ ...eloEdits, [u.id]: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && saveElo(u)}
                    className="w-[64px] border-2 border-admin-border bg-[#14110d] px-1 py-1 text-right font-disp text-[14px] text-cream"
                    aria-label="ELO"
                  />
                  <button
                    onClick={() => saveElo(u)}
                    disabled={busy}
                    className="ml-1 text-[14px] leading-none text-ink-3 hover:text-[#7fd6a3]"
                    title="Enregistrer l'ELO"
                  >
                    ✓
                  </button>
                </td>
                <td className="ta-r whitespace-nowrap">
                  <input
                    type="number"
                    value={kopEdits[u.id] ?? String(u.kopecks)}
                    onChange={(e) => setKopEdits({ ...kopEdits, [u.id]: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && saveKopecks(u)}
                    className="w-[80px] border-2 border-admin-border bg-[#14110d] px-1 py-1 text-right font-disp text-[14px] text-cream"
                    aria-label="Kopecks"
                  />
                  <button
                    onClick={() => saveKopecks(u)}
                    disabled={busy}
                    className="ml-1 text-[14px] leading-none text-ink-3 hover:text-[#7fd6a3]"
                    title="Enregistrer les Kopecks"
                  >
                    ✓
                  </button>
                </td>
                <td className="ta-r font-disp text-[14px]">{u.loginCount}</td>
                <td className="ta-r text-[11px] text-[#c7bda8]">{fmt(u.lastLogin)}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center">
                  Aucun utilisateur.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Connexions récentes */}
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

      <div className="mt-5 flex justify-center gap-4">
        <Link href="/admin" className="text-[12px] font-semibold text-ink-3 underline">
          ← Console admin
        </Link>
        <Link href="/" className="text-[12px] font-semibold text-ink-3 underline">
          Tableau de bord
        </Link>
      </div>
    </main>
  );
}
