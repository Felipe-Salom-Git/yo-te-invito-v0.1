'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';

const TENANT_FALLBACK = 'tenant-demo';

export function GastroDiscountClaimForm({
  discountId,
  claimable,
}: {
  discountId: string;
  claimable: boolean;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_FALLBACK;

  const sessionEmail =
    (session?.user as { email?: string } | undefined)?.email?.trim() ?? '';

  const [email, setEmail] = useState(sessionEmail);
  const [error, setError] = useState<string | null>(null);

  const claimMutation = useMutation({
    mutationFn: () =>
      repos.publicGastro.claimDiscount(discountId, {
        tenantId: t,
        email: email.trim(),
      }),
    onSuccess: (result) => {
      const params = new URLSearchParams({
        token: result.accessToken,
        tenantId: t,
      });
      router.push(`/descuentos/reclamo/${result.claimId}?${params.toString()}`);
    },
    onError: (err: Error) => {
      setError(err.message || 'No se pudo reclamar el descuento');
    },
  });

  if (!claimable) {
    return (
      <p className="rounded-lg border border-border bg-bg-muted px-4 py-3 text-sm text-text-muted">
        Este descuento aún no está disponible para reclamar.
      </p>
    );
  }

  return (
    <form
      className="rounded-xl border border-accent/40 bg-accent/5 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (!email.trim()) {
          setError('Ingresá tu email');
          return;
        }
        claimMutation.mutate();
      }}
    >
      <h2 className="text-lg font-semibold text-text">Reclamá tu código QR</h2>
      <p className="mt-1 text-sm text-text-muted">
        Es gratis, como un ticket sin costo. Te enviamos el QR por email para presentar en el local.
      </p>

      <label className="mt-4 block text-sm font-medium text-text" htmlFor="claim-email">
        Email
      </label>
      <input
        id="claim-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-text"
        placeholder="tu@email.com"
        disabled={claimMutation.isPending}
      />

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={claimMutation.isPending}
        className="mt-4 w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-bg transition hover:opacity-90 disabled:opacity-60"
      >
        {claimMutation.isPending ? 'Enviando…' : 'Enviar QR a mi email'}
      </button>
    </form>
  );
}
