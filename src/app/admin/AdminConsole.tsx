'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface UserSummary {
  id: number;
  username: string;
  role: 'user' | 'admin';
  elo: number;
  created_at: string;
}
interface TokenStatus {
  present: boolean;
  active: boolean;
  expiresAt: string | null;
  username: string | null;
}
interface SyncState {
  ok: boolean;
  imported: number;
  daysImported: number;
  lastDay: number;
  more: boolean;
  error?: string;
  startedAt: string;
  finishedAt: string;
}
interface Contestation {
  id: number;
  username: string;
  prompt: string;
  correctAnswer: string;
  chosenAnswer: string;
}

function Plus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function Refresh() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 12a9 9 0 0115.5-6.3M21 4v5h-5M21 12a9 9 0 01-15.5 6.3M3 20v-5h5" />
    </svg>
  );
}

export default function AdminConsole() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [token, setToken] = useState<{ status: TokenStatus; baseUrl: string | null } | null>(null);
  const [sync, setSync] = useState<SyncState | null>(null);
  const [contestations, setContestations] = useState<Contestation[]>([]);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState<{ username: string; password: string; role: 'user' | 'admin' }>({
    username: '',
    password: '',
    role: 'user',
  });
  const [tokenInput, setTokenInput] = useState('');
  const [eloEdits, setEloEdits] = useState<Record<number, string>>({});

  const refresh = useCallback(async () => {
    const [u, t, s, ct] = await Promise.all([
      fetch('/api/admin/users').then((r) => r.json()),
      fetch('/api/admin/token').then((r) => r.json()),
      fetch('/api/admin/sync').then((r) => r.json()),
      fetch('/api/admin/contestations').then((r) => r.json()),
    ]);
    setUsers(u.users ?? []);
    setToken({ status: t.status, baseUrl: t.baseUrl });
    setSync(s.state ?? null);
    setContestations(ct.contestations ?? []);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function saveToken() {
    if (!tokenInput.trim()) return;
    setBusy(true);
    setNotice(null);
    const res = await fetch('/api/admin/token', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenInput.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setNotice(data.error ?? 'Erreur token');
    else {
      setTokenInput('');
      setToken({ status: data.status, baseUrl: data.baseUrl });
    }
    setBusy(false);
  }

  async function runSync() {
    if (syncing) return;
    setSyncing(true);
    setNotice(null);
    const res = await fetch('/api/admin/sync', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setSync(data.state ?? null);
    if (data.state && !data.state.ok) setNotice(data.state.error ?? 'Synchro en échec');
    setSyncing(false);
  }

  async function resolveContest(id: number, accept: boolean) {
    setBusy(true);
    await fetch(`/api/admin/contestations/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accept }),
    });
    await refresh();
    setBusy(false);
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

  async function saveElo(id: number, current: number) {
    const raw = eloEdits[id];
    const value = raw === undefined ? current : Math.round(Number(raw));
    if (!Number.isFinite(value)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ elo: value }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setNotice(data.error ?? 'ELO non enregistré');
    } else {
      setEloEdits((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await refresh();
    }
    setBusy(false);
  }

  const st = token?.status;
  const tokenHint = st?.expiresAt
    ? `Compte ${st.username ?? '—'} · expire le ${new Date(st.expiresAt).toLocaleString('fr-FR')}`
    : st?.present
      ? 'Token enregistré (expiration inconnue)'
      : 'Aucun token enregistré.';
  const syncHint = sync
    ? `Dernier : ${sync.ok ? 'OK' : 'échec'} · ${sync.imported} questions · ${sync.daysImported} jour(s) · curseur J${sync.lastDay}${sync.more ? ' · reste à importer (relancer)' : ''}`
    : 'Aucune synchro effectuée.';

  return (
    <main className="mx-auto w-full max-w-[640px] px-[18px] pb-[42px] pt-[60px] text-cream">
      <header className="adm-head">
        <div>
          <div className="adm-eyebrow">CONSOLE — RVR</div>
          <div className="adm-title">ADMINISTRATION</div>
        </div>
        <span className="adm-env">PROD</span>
      </header>

      {notice && (
        <p className="mb-3 border-2 border-fail/40 bg-fail/10 px-3 py-2 text-[13px] text-fail">{notice}</p>
      )}

      {/* Token */}
      <section className="adm-panel">
        <div className="adm-panel-head">
          <span>TOKEN D&apos;API — LA TABLE DES SAVOIRS</span>
          <span className={`token-pill ${st?.active ? 'is-on' : 'is-off'}`}>
            <span className="token-dot" />
            {st?.present ? (st.active ? 'TOKEN ACTIF' : 'TOKEN EXPIRÉ') : 'NON CONFIGURÉ'}
          </span>
        </div>
        <div className="adm-token-row">
          <input
            className="adm-input"
            placeholder="Coller un nouveau token (JWT)…"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            spellCheck={false}
          />
          <button className="adm-btn-ghost" onClick={saveToken} disabled={busy}>
            ENREGISTRER
          </button>
        </div>
        <div className="adm-hint">
          {tokenHint}
          {token?.baseUrl ? ` · ${token.baseUrl}` : ''}
        </div>
      </section>

      {/* Synchronisation */}
      <section className="adm-panel">
        <div className="adm-panel-head">
          <span>SYNCHRONISATION — QUESTIONS</span>
        </div>
        <button className={`adm-btn-sync ${syncing ? 'is-syncing' : ''}`} onClick={runSync} disabled={syncing}>
          <Refresh />
          {syncing ? 'SYNCHRONISATION…' : 'SCRAPING MANUEL'}
        </button>
        <div className="adm-hint">{syncHint}</div>
      </section>

      {/* Contestations */}
      <section className="adm-panel">
        <div className="adm-panel-head">
          <span>CONTESTATIONS · {contestations.length}</span>
        </div>
        {contestations.length === 0 ? (
          <p className="text-[12px] text-[#79705f]">Aucune contestation en attente.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {contestations.map((c) => (
              <div key={c.id} className="border border-admin-border p-3">
                <div className="mb-2 text-[12px] font-bold text-cream">⚑ Demande de {c.username}</div>
                <div className="text-[13px] text-[#c7bda8]">{c.prompt}</div>
                <div className="mt-2 text-[12px]">
                  <span className="text-[#79705f]">Bonne réponse :</span>{' '}
                  <span className="text-cream">{c.correctAnswer}</span>
                </div>
                <div className="text-[12px]">
                  <span className="text-[#79705f]">Réponse contestée :</span>{' '}
                  <span className="text-cream">{c.chosenAnswer}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => resolveContest(c.id, true)}
                    disabled={busy}
                    className="adm-btn-ghost"
                    style={{ borderColor: '#1E9E5A', color: '#7fd6a3' }}
                  >
                    Accepter
                  </button>
                  <button onClick={() => resolveContest(c.id, false)} disabled={busy} className="adm-btn-ghost">
                    Rejeter
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Utilisateurs */}
      <section className="adm-panel adm-panel--flush">
        <div className="adm-panel-head adm-panel-head--pad">
          <span>UTILISATEURS · {users.length}</span>
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
              <th>Rôle</th>
              <th className="ta-r">ELO</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="adm-td-name">{u.username}</td>
                <td>
                  <span className={`adm-role ${u.role === 'admin' ? 'is-admin' : ''}`}>{u.role}</span>
                </td>
                <td className="ta-r">
                  <input
                    type="number"
                    value={eloEdits[u.id] ?? String(u.elo)}
                    onChange={(e) => setEloEdits({ ...eloEdits, [u.id]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveElo(u.id, u.elo);
                    }}
                    className="w-[70px] border-2 border-admin-border bg-[#14110d] px-1 py-1 text-right font-disp text-[14px] text-cream"
                    aria-label="ELO"
                  />
                </td>
                <td className="ta-r">
                  <button
                    onClick={() => saveElo(u.id, u.elo)}
                    disabled={busy}
                    className="mr-3 text-[15px] leading-none text-ink-3 hover:text-[#7fd6a3]"
                    title="Enregistrer l'ELO"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => removeUser(u.id)}
                    className="text-[16px] leading-none text-ink-3 hover:text-fail"
                    title="Supprimer"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center">
                  Aucun utilisateur.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <div className="mt-5 text-center">
        <Link href="/" className="text-[12px] font-semibold text-ink-3 underline">
          ← Tableau de bord
        </Link>
      </div>
    </main>
  );
}
