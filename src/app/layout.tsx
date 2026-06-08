import type { Metadata } from 'next';
import { Anton, Archivo } from 'next/font/google';
import './globals.css';

// Polices self-hostées au build (aucun appel à Google au runtime).
const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-disp',
  display: 'swap',
});
const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Quizzs à Gogo',
  description: 'Quiz constructiviste avec progression ELO joueur-vs-question.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${anton.variable} ${archivo.variable}`}>
      <body className="bg-paper font-sans text-ink antialiased">
        {children}
        <footer className="py-4 text-center text-[11px] font-semibold tracking-[0.04em] text-ink-3">
          Vickes - Revolution On The Run - 2026
        </footer>
      </body>
    </html>
  );
}
