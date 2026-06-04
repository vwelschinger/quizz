import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { listThemes } from '@/lib/db/questions';
import { GeoMark, themeMark } from '../GeoMark';

export const dynamic = 'force-dynamic';

export default async function ThemesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const themes = await listThemes();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-[18px] pb-[42px] pt-[60px]">
      <div className="mb-4">
        <Link href="/" className="text-[12px] font-semibold text-ink-2 underline">
          ← Tableau de bord
        </Link>
      </div>

      <header className="mb-5">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-deep">
          Entraînement ciblé
        </div>
        <h1 className="font-disp text-[40px] uppercase leading-[0.9] tracking-disp">
          Session à thème
        </h1>
        <p className="mt-2 text-[13px] font-semibold text-ink-2">
          Choisis un thème : la série ne portera que sur celui-ci.
        </p>
      </header>

      {themes.length === 0 ? (
        <p className="mt-6 text-center text-[13px] text-ink-2">
          Aucun thème disponible — lance une synchro depuis la console admin.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-[12px]">
          {themes.map((t) => {
            const mark = themeMark(t.theme);
            return (
              <Link
                key={t.theme}
                href={`/quiz?theme=${encodeURIComponent(t.theme)}`}
                className="card-hard flex min-h-[96px] flex-col justify-between px-[12px] pb-[10px] pt-[10px]"
              >
                <GeoMark shape={mark.shape} color={mark.color} size={18} />
                <div>
                  <div className="font-disp text-[17px] uppercase leading-[0.95] tracking-disp">
                    {t.theme}
                  </div>
                  <div className="mt-[3px] text-[10.5px] font-bold uppercase tracking-[0.03em] text-ink-2">
                    {t.total} question{t.total > 1 ? 's' : ''}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
