'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Mode = 'login' | 'signup';

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const signup = mode === 'signup';

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = signup ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? (signup ? 'Inscription impossible' : 'Connexion impossible'));
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col px-[22px] pb-10 pt-[62px]">
      <div className="auth-mark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="mx-auto mb-3 block w-[260px] max-w-full"
          src="/logo-revorun.svg"
          alt="Revolution On The Run"
        />
        <div className="auth-word">
          Quizzs à <span className="red">Gogo</span>
        </div>
        <div className="auth-tag">L&apos;APPRENTISSAGE EN MOUVEMENT</div>
      </div>

      <div className="auth-toggle">
        <button type="button" className={!signup ? 'is-active' : ''} onClick={() => switchMode('login')}>
          CONNEXION
        </button>
        <button type="button" className={signup ? 'is-active' : ''} onClick={() => switchMode('signup')}>
          INSCRIPTION
        </button>
      </div>

      <form className="auth-form" onSubmit={onSubmit}>
        <label className="field">
          <span className="field-lbl">Pseudo</span>
          <input
            className="auth-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ex. Alex"
            autoComplete="username"
            required
          />
        </label>
        <label className="field">
          <span className="field-lbl">Mot de passe</span>
          <input
            className="auth-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete={signup ? 'new-password' : 'current-password'}
            required
          />
        </label>

        {error && <p className="text-[13px] font-semibold text-fail">{error}</p>}

        <button type="submit" className="cta-primary cta-next auth-cta" disabled={loading}>
          {loading ? '…' : signup ? "S'INSCRIRE" : 'ENTRER'}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M4 12h15M13 6l7 6-7 6" />
          </svg>
        </button>

        {signup && (
          <p className="auth-fine">En continuant, tu rejoins le classement ELO de la communauté.</p>
        )}
      </form>

      <div className="auth-switch">
        {signup ? 'Déjà un compte ?' : 'Pas encore de compte ?'}
        <button type="button" onClick={() => switchMode(signup ? 'login' : 'signup')}>
          {signup ? 'Se connecter' : "S'inscrire"}
        </button>
      </div>
    </div>
  );
}
