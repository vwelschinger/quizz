'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminTitle } from '../AdminChrome';

interface Contestation {
  id: number;
  username: string;
  prompt: string;
  correctAnswer: string;
  chosenAnswer: string;
  battleId: number | null;
}

export default function ContestationsAdmin() {
  const [contestations, setContestations] = useState<Contestation[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const ct = await fetch('/api/admin/contestations').then((r) => r.json());
    setContestations(ct.contestations ?? []);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

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

  return (
    <main className="mx-auto w-full max-w-[640px] px-[18px] pb-[42px] pt-[60px] text-cream">
      <AdminTitle title="CONTESTATIONS" />

      <section className="adm-panel">
        <div className="adm-panel-head">
          <span>EN ATTENTE · {contestations.length}</span>
        </div>
        {contestations.length === 0 ? (
          <p className="text-[12px] text-[#79705f]">Aucune contestation en attente.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {contestations.map((c) => (
              <div key={c.id} className="border border-admin-border p-3">
                <div className="mb-2 text-[12px] font-bold text-cream">
                  ⚑ Demande de {c.username}
                  {c.battleId != null && (
                    <span className="ml-2 rounded bg-[#3a4a5a] px-[6px] py-[1px] text-[10px] font-bold uppercase tracking-wide text-[#cfe0f0]">
                      bataille
                    </span>
                  )}
                </div>
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
    </main>
  );
}
