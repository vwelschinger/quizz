'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminTitle } from '../AdminChrome';

interface AdminUser {
  id: number;
  username: string;
  role: 'user' | 'admin';
  elo: number;
  kopecks: number;
  loginCount: number;
  lastLogin: string | null;
  lastSeen: string | null;
  createdAt: string;
}

function fmt(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function Plus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default function JoueursAdmin() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [eloEdits, setEloEdits] = useState<Record<number, string>>({});
  const [kopEdits, setKopEdits] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState<{ username: string; password: string; role: 'user' | 'admin' }>({
    username: '',
    password: '',
    role: 'user',
  });

  const refresh = useCallback(async () => {
    const u = await fetch('/api/admin/users/detailed').then((r) => r.json());
    setUsers(u.users ?? []);
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

  async function createUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setNotice(data.error ?? 'Erreur lors de la création');
    else {
      setNewUser({ username: '', password: '', role: 'user' });
      setShowCreate(false);
      await refresh();
    }
    setBusy(false);
  }

  async function removeUser(id: number) {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    setBusy(true);
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    await refresh();
    setBusy(false);
  }

  return (
    <main className="mx-auto w-full max-w-[760px] px-[18px] pb-[42px] pt-[60px] text-cream">
      <AdminTitle title="JOUEURS" />

      {notice && (
        <p className="mb-3 border-2 border-fail/40 bg-fail/10 px-3 py-2 text-[13px] text-fail">{notice}</p>
      )}

      <section className="adm-panel adm-panel--flush">
        <div className="adm-panel-head adm-panel-head--pad">
          <span>GESTION · {users.length}</span>
          <button className="adm-btn-add" onClick={() => setShowCreate((v) => !v)}>
            <Plus />
            AJOUTER
          </button>
        </div>

        {showCreate && (
          <form onSubmit={createUser} className="flex flex-col gap-2 px-[15px] pb-3">
            <input
              className="adm-input"
              placeholder="Pseudo"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              required
            />
            <input
              className="adm-input"
              type="password"
              placeholder="Mot de passe (6+ caractères)"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              required
            />
            <div className="flex gap-2">
              <select
                className="adm-input"
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'user' | 'admin' })}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
              <button type="submit" className="adm-btn-ghost" disabled={busy}>
                CRÉER
              </button>
            </div>
          </form>
        )}

        <table className="adm-table">
          <thead>
            <tr>
              <th>Pseudo</th>
              <th className="ta-r">ELO</th>
              <th className="ta-r">Kopecks</th>
              <th className="ta-r">Cnx</th>
              <th className="ta-r">Activité</th>
              <th />
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
                    className="w-[60px] border-2 border-admin-border bg-[#14110d] px-1 py-1 text-right font-disp text-[14px] text-cream"
                    aria-label="ELO"
                  />
                  <button onClick={() => saveElo(u)} disabled={busy} className="ml-1 text-[14px] leading-none text-ink-3 hover:text-[#7fd6a3]" title="Enregistrer l'ELO">
                    ✓
                  </button>
                </td>
                <td className="ta-r whitespace-nowrap">
                  <input
                    type="number"
                    value={kopEdits[u.id] ?? String(u.kopecks)}
                    onChange={(e) => setKopEdits({ ...kopEdits, [u.id]: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && saveKopecks(u)}
                    className="w-[76px] border-2 border-admin-border bg-[#14110d] px-1 py-1 text-right font-disp text-[14px] text-cream"
                    aria-label="Kopecks"
                  />
                  <button onClick={() => saveKopecks(u)} disabled={busy} className="ml-1 text-[14px] leading-none text-ink-3 hover:text-[#7fd6a3]" title="Enregistrer les Kopecks">
                    ✓
                  </button>
                </td>
                <td className="ta-r font-disp text-[14px]">{u.loginCount}</td>
                <td className="ta-r text-[11px] text-[#c7bda8]">{fmt(u.lastSeen)}</td>
                <td className="ta-r">
                  <button onClick={() => removeUser(u.id)} className="text-[15px] leading-none text-ink-3 hover:text-fail" title="Supprimer">
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center">
                  Aucun utilisateur.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
