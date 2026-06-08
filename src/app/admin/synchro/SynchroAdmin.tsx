'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminTitle } from '../AdminChrome';

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

function Refresh() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 12a9 9 0 0115.5-6.3M21 4v5h-5M21 12a9 9 0 01-15.5 6.3M3 20v-5h5" />
    </svg>
  );
}

export default function SynchroAdmin() {
  const [token, setToken] = useState<{ status: TokenStatus; baseUrl: string | null } | null>(null);
  const [sync, setSync] = useState<SyncState | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [t, s] = await Promise.all([
      fetch('/api/admin/token').then((r) => r.json()),
      fetch('/api/admin/sync').then((r) => r.json()),
    ]);
    setToken({ status: t.status, baseUrl: t.baseUrl });
    setSync(s.state ?? null);
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
      <AdminTitle title="SYNCHRO" />

      {notice && (
        <p className="mb-3 border-2 border-fail/40 bg-fail/10 px-3 py-2 text-[13px] text-fail">{notice}</p>
      )}

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
    </main>
  );
}
