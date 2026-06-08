'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminTitle } from '../AdminChrome';
import { getJoker } from '@/lib/jokers/catalog';

interface Purchase {
  id: number;
  username: string;
  jokerId: string;
  price: number;
  createdAt: string;
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AchatsAdmin() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const refresh = useCallback(async () => {
    const p = await fetch('/api/admin/purchases').then((r) => r.json());
    setPurchases(p.purchases ?? []);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const total = purchases.reduce((s, p) => s + p.price, 0);

  return (
    <main className="mx-auto w-full max-w-[700px] px-[18px] pb-[42px] pt-[60px] text-cream">
      <AdminTitle title="ACHATS" />

      <section className="adm-panel adm-panel--flush">
        <div className="adm-panel-head adm-panel-head--pad">
          <span>ACHATS DE JOKERS · {purchases.length}</span>
          {purchases.length > 0 && (
            <span className="text-[11px] font-semibold text-[#9a917e]">
              {total.toLocaleString('fr-FR')} Kopecks dépensés
            </span>
          )}
        </div>
        {purchases.length === 0 ? (
          <p className="px-[15px] pb-3 text-[12px] text-[#79705f]">Aucun achat enregistré.</p>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Pseudo</th>
                <th>Joker</th>
                <th className="ta-r">Prix</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td className="adm-td-name">{p.username}</td>
                  <td className="flex items-center gap-2 text-[12px] text-cream">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/jokers/${p.jokerId}.svg`} alt="" width={18} height={18} />
                    {getJoker(p.jokerId)?.name ?? p.jokerId}
                  </td>
                  <td className="ta-r font-disp text-[13px]">{p.price.toLocaleString('fr-FR')}</td>
                  <td className="text-[11px] text-[#c7bda8]">{fmt(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
