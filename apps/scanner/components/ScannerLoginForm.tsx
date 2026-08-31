'use client';

import { FormEvent, useState } from 'react';
import { Role } from '@yo-te-invito/shared';
import { loginScanner } from '@/lib/api/auth';
import { fetchScannerAccount } from '@/lib/api/scanner';
import { clearScannerSession, setScannerSession, type ScannerSession } from '@/lib/auth/session';

type Props = {
  onSuccess: (session: ScannerSession) => void;
};

export function ScannerLoginForm({ onSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await loginScanner({
        email: email.trim(),
        password,
      });
      if (response.user.role !== Role.SCANNER && response.user.role !== Role.ADMIN) {
        setError('Esta cuenta no tiene permisos de scanner. Pedí acceso a tu productora o local.');
        return;
      }
      const session: ScannerSession = {
        token: response.token,
        user: response.user,
      };
      setScannerSession(session);
      const account = await fetchScannerAccount();
      if (!account && response.user.role !== Role.ADMIN) {
        clearScannerSession();
        setError('No encontramos una cuenta scanner vinculada a este usuario.');
        return;
      }
      if (account && !account.isActive) {
        clearScannerSession();
        setError('Tu cuenta scanner está desactivada. Contactá a quien te dio acceso.');
        return;
      }
      onSuccess(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex w-full max-w-sm flex-col gap-4">
      <div>
        <label htmlFor="scanner-email" className="text-sm text-scanner-muted">
          Email
        </label>
        <input
          id="scanner-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 block w-full rounded-lg border border-scanner-border bg-scanner-bg px-4 py-3 text-white placeholder:text-scanner-muted/60 focus:border-scanner-accent focus:outline-none focus:ring-1 focus:ring-scanner-accent"
          placeholder="tu@email.com"
        />
      </div>
      <div>
        <label htmlFor="scanner-password" className="text-sm text-scanner-muted">
          Contraseña
        </label>
        <input
          id="scanner-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 block w-full rounded-lg border border-scanner-border bg-scanner-bg px-4 py-3 text-white focus:border-scanner-accent focus:outline-none focus:ring-1 focus:ring-scanner-accent"
        />
      </div>
      {error && (
        <p className="rounded-lg border border-red-800/80 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading || !email.trim() || !password}
        className="h-12 min-h-[48px] rounded-xl bg-scanner-accent text-base font-semibold text-scanner-bg transition-colors hover:bg-scanner-accent-hover disabled:opacity-50"
      >
        {loading ? 'Ingresando…' : 'Ingresar al scanner'}
      </button>
    </form>
  );
}
