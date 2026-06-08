import Link from 'next/link';

interface Tile {
  href: string;
  title: string;
  value: string;
  label: string;
  accent?: boolean; // met en valeur (ex. contestations en attente)
}

function Tile({ href, title, value, label, accent }: Tile) {
  return (
    <Link
      href={href}
      className="flex flex-col justify-between border-2 bg-[#211c16] px-4 pb-3 pt-[14px] transition-colors hover:bg-[#2c261d]"
      style={{ borderColor: accent ? '#a23b2e' : '#3a3225' }}
    >
      <div className="text-[10px] font-extrabold uppercase tracking-[0.16em]" style={{ color: 'var(--blue)' }}>
        {title}
      </div>
      <div className="mt-3 font-disp text-[34px] leading-[0.9] tracking-disp text-cream">{value}</div>
      <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#9a917e]">
        {label}
      </div>
    </Link>
  );
}

export default function AdminMenu({
  pending,
  users,
  logins,
  purchases,
  tokenActive,
}: {
  pending: number;
  users: number;
  logins: number;
  purchases: number;
  tokenActive: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Tile
        href="/admin/contestations"
        title="Contestations"
        value={String(pending)}
        label={pending > 0 ? 'en attente' : 'à traiter'}
        accent={pending > 0}
      />
      <Tile href="/admin/joueurs" title="Joueurs" value={String(users)} label="comptes · ELO · kopecks" />
      <Tile href="/admin/connexions" title="Connexions" value={String(logins)} label="connexions · activité" />
      <Tile href="/admin/achats" title="Achats" value={String(purchases)} label="achats de jokers" />
      <Tile
        href="/admin/synchro"
        title="Synchro"
        value={tokenActive ? 'ON' : 'OFF'}
        label="scraping · token API"
        accent={!tokenActive}
      />
    </div>
  );
}
