'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';

const TENANT_FALLBACK = 'tenant-demo';

export function ActivityCouponClaimForm({ couponId }: { couponId: string }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_FALLBACK;
  const isLoggedIn = status === 'authenticated' && !!session?.user;
  const sessionEmail = (session?.user as { email?: string } | undefined)?.email?.trim() ?? '';
  const [email, setEmail] = useState(sessionEmail);
  const [error, setError] = useState<string | null>(null);

  const claimMutation = useMutation({
    mutationFn: () =>
      repos.activityCoupons.claimPublic(t, couponId, isLoggedIn ? sessionEmail : email.trim()),
    onSuccess: (result) => {
      const params = new URLSearchParams({
        token: result.accessToken,
        tenantId: t,
      });
      router.push(`/excursiones/cupones/reclamo/${result.claimId}?${params.toString()}`);
    },
    onError: (err: Error) => setError(err.message || 'No se pudo reclamar el cupón'),
  });

  return (
    <form
      className="rounded-xl border border-accent/40 bg-accent/5 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const targetEmail = isLoggedIn ? sessionEmail : email.trim();
        if (!targetEmail) {
          setError('Ingresá tu email');
          return;
        }
        claimMutation.mutate();
      }}
    >
      <h2 className="text-lg font-semibold text-text">Reclamar cupón</h2>
      <p className="mt-1 text-sm text-text-muted">
        {isLoggedIn
          ? `Lo guardamos en tu cuenta${sessionEmail ? ` (${sessionEmail})` : ''}.`
          : 'Ingresá tu email para emitir el QR y el código corto.'}
      </p>
      {!isLoggedIn && (
        <input
          type="email"
          className="mt-3 w-full rounded border border-border bg-bg px-3 py-2 text-text"
          placeholder="email@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      )}
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={claimMutation.isPending}
        className="mt-4 rounded bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-accent-hover disabled:opacity-50"
      >
        {claimMutation.isPending ? 'Reclamando…' : 'Reclamar'}
      </button>
    </form>
  );
}
