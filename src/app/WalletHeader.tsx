import Link from 'next/link';
import type { JokerInventoryRow } from '@/lib/jokers/ledger';

const OCTAGON = 'polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)';

/** En-tête « portefeuille » du dashboard : solde de Kopecks + jokers possédés → /jokers. */
export default function WalletHeader({
  balance,
  jokers,
}: {
  balance: number;
  jokers: JokerInventoryRow[];
}) {
  return (
    <Link
      href="/jokers"
      title="Tes Kopecks et tes jokers"
      className="flex items-center gap-2 border-[3px] border-ink bg-card px-[10px] py-[7px] shadow-hard"
    >
      <span
        aria-hidden
        className="flex h-[22px] w-[22px] items-center justify-center bg-brand font-disp text-[12px] leading-none text-ink"
        style={{ clipPath: OCTAGON }}
      >
        ★
      </span>
      <span className="font-disp text-[18px] leading-none tracking-disp">
        {balance.toLocaleString('fr-FR')}
      </span>
      {jokers.length > 0 && (
        <span className="flex items-center gap-[3px] pl-1">
          {jokers.slice(0, 3).map((j) => (
            <span key={j.joker_id} className="relative inline-flex">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/jokers/${j.joker_id}.svg`} alt="" width={18} height={18} />
              {j.qty > 1 && (
                <span className="absolute -right-[5px] -top-[5px] flex h-[13px] min-w-[13px] items-center justify-center rounded-full border border-ink bg-ink px-[2px] text-[9px] font-bold leading-none text-cream">
                  {j.qty}
                </span>
              )}
            </span>
          ))}
        </span>
      )}
    </Link>
  );
}
