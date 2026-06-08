import Link from 'next/link';

/** En-tête commun des sous-pages admin : titre + retour au menu. */
export function AdminTitle({ title }: { title: string }) {
  return (
    <header className="adm-head">
      <div>
        <div className="adm-eyebrow">CONSOLE — RVR</div>
        <div className="adm-title">{title}</div>
      </div>
      <Link
        href="/admin"
        className="border-2 border-[#3a3225] px-3 py-[6px] font-disp text-[12px] uppercase tracking-disp text-cream hover:bg-[#2c261d]"
      >
        ← Menu
      </Link>
    </header>
  );
}
