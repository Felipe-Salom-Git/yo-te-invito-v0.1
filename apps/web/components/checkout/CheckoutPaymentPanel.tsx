'use client';

import Link from 'next/link';
import { Button } from '@/components';
import { getErrorMessage } from '@/lib/errors';

type Props = {
  orderId: string;
  totalLabel: string;
  tenantId: string;
  onPayDemo: () => void;
  onPayGetnet: () => void;
  demoPending: boolean;
  getnetPending: boolean;
  error: unknown;
  backHref?: string;
  backLabel?: string;
};

/** Paso de pago compartido (checkout por evento u orden pendiente). */
export function CheckoutPaymentPanel({
  orderId,
  totalLabel,
  onPayDemo,
  onPayGetnet,
  demoPending,
  getnetPending,
  error,
  backHref,
  backLabel,
}: Props) {
  return (
    <div className="mt-8 rounded-xl border border-border bg-bg-muted p-6">
      {backHref && (
        <Link href={backHref} className="mb-4 inline-block text-sm text-text-muted hover:text-text">
          {backLabel ?? '← Volver'}
        </Link>
      )}
      <h2 className="font-semibold text-text">Forma de pago</h2>
      <p className="mt-2 text-text-muted">
        Orden <span className="font-mono text-xs">{orderId}</span> — {totalLabel}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button onClick={onPayDemo} disabled={demoPending || getnetPending}>
          {demoPending ? 'Procesando…' : 'Pagar (demo)'}
        </Button>
        <Button
          variant="outline"
          onClick={onPayGetnet}
          disabled={demoPending || getnetPending}
          title="Checkout Getnet — usa las credenciales configuradas en el backend (producción = pago real)"
        >
          {getnetPending ? 'Redirigiendo…' : 'Pagar con Getnet'}
        </Button>
      </div>
      <p className="mt-3 text-xs text-amber-600/90 dark:text-amber-400/90">
        Getnet usa el ambiente definido en la API (<code className="text-xs">GETNET_ENV</code>). Con credenciales de
        producción el cobro es real. Demo no mueve dinero.
      </p>
      {error != null && (
        <p className="mt-2 text-sm text-red-400">{getErrorMessage(error)}</p>
      )}
    </div>
  );
}
