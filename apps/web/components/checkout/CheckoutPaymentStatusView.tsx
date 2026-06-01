'use client';

import Link from 'next/link';
import type { CheckoutPaymentStatusResponse } from '@yo-te-invito/shared';
import { CheckoutPaymentDisplayPhase } from '@yo-te-invito/shared';
import { Button } from '@/components';

type Props = {
  status: CheckoutPaymentStatusResponse;
  tenantId: string;
  isAuthenticated: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
};

const SUPPORT_HREF = '/#footer-support';

export function CheckoutPaymentStatusView({
  status,
  tenantId,
  isAuthenticated,
  onRefresh,
  isRefreshing,
}: Props) {
  const phase = status.displayPhase;
  const checkoutHref =
    status.checkoutUrl ??
    `/checkout/${encodeURIComponent(status.eventId)}?tenantId=${encodeURIComponent(tenantId)}&orderId=${encodeURIComponent(status.orderId)}`;

  const titleByPhase: Record<string, string> = {
    [CheckoutPaymentDisplayPhase.APPROVED]: 'Pago aprobado',
    [CheckoutPaymentDisplayPhase.PENDING]: 'Pago pendiente',
    [CheckoutPaymentDisplayPhase.REJECTED]: 'Pago rechazado',
    [CheckoutPaymentDisplayPhase.CANCELLED]: 'Pago cancelado',
    [CheckoutPaymentDisplayPhase.EXPIRED]: 'Orden expirada',
    [CheckoutPaymentDisplayPhase.MANUAL_REVIEW]: 'Pago en revisión',
  };

  const messageByPhase: Record<string, string> = {
    [CheckoutPaymentDisplayPhase.APPROVED]: status.ticketsIssued
      ? 'Pago aprobado. Tus entradas ya están listas.'
      : 'Pago aprobado. Estamos preparando tus entradas.',
    [CheckoutPaymentDisplayPhase.PENDING]:
      'Estamos esperando la confirmación del pago.',
    [CheckoutPaymentDisplayPhase.REJECTED]: 'El pago fue rechazado.',
    [CheckoutPaymentDisplayPhase.CANCELLED]: 'El pago fue cancelado.',
    [CheckoutPaymentDisplayPhase.EXPIRED]: 'La orden expiró.',
    [CheckoutPaymentDisplayPhase.MANUAL_REVIEW]:
      'Recibimos una confirmación de pago, pero necesitamos revisar la operación.',
  };

  const noteByPhase: Record<string, string | undefined> = {
    [CheckoutPaymentDisplayPhase.PENDING]:
      'Esto puede demorar unos minutos. No vuelvas a pagar si ya completaste la operación.',
    [CheckoutPaymentDisplayPhase.MANUAL_REVIEW]:
      'No vuelvas a pagar esta orden. Nuestro equipo revisará el caso.',
  };

  const borderClass =
    phase === CheckoutPaymentDisplayPhase.APPROVED
      ? 'border-accent/50 bg-accent/10'
      : phase === CheckoutPaymentDisplayPhase.MANUAL_REVIEW
        ? 'border-amber-500/40 bg-amber-500/10'
        : phase === CheckoutPaymentDisplayPhase.REJECTED ||
            phase === CheckoutPaymentDisplayPhase.EXPIRED
          ? 'border-red-500/30 bg-red-500/5'
          : 'border-border bg-bg-muted/50';

  return (
    <div className={`rounded-xl border p-6 ${borderClass}`}>
      <h2 className="text-lg font-semibold text-text">{titleByPhase[phase] ?? 'Estado del pago'}</h2>
      <p className="mt-2 text-text-muted">{messageByPhase[phase]}</p>
      {noteByPhase[phase] && (
        <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">{noteByPhase[phase]}</p>
      )}
      {status.requiresManualReview && status.reconciliationReason && (
        <p className="mt-2 font-mono text-xs text-text-muted">
          Referencia: {status.reconciliationReason}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {phase === CheckoutPaymentDisplayPhase.APPROVED && status.canViewTickets && (
          <>
            {isAuthenticated ? (
              <Link
                href="/me/tickets"
                className="inline-flex items-center rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-bg hover:bg-accent-hover"
              >
                Ver mis tickets
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-bg hover:bg-accent-hover"
              >
                Crear cuenta o iniciar sesión para ver tus tickets
              </Link>
            )}
          </>
        )}

        {phase === CheckoutPaymentDisplayPhase.PENDING && onRefresh && (
          <Button onClick={onRefresh} disabled={isRefreshing} variant="outline">
            {isRefreshing ? 'Actualizando…' : 'Actualizar estado'}
          </Button>
        )}

        {status.canRetryPayment && (
          <Link
            href={checkoutHref}
            className="inline-flex items-center rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-bg hover:bg-accent-hover"
          >
            {phase === CheckoutPaymentDisplayPhase.REJECTED
              ? 'Intentar nuevamente'
              : phase === CheckoutPaymentDisplayPhase.EXPIRED
                ? 'Volver a comprar'
                : 'Volver al checkout'}
          </Link>
        )}

        {phase === CheckoutPaymentDisplayPhase.CANCELLED && (
          <Link
            href={checkoutHref}
            className="inline-flex items-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text hover:border-accent/50"
          >
            Volver al checkout
          </Link>
        )}

        {status.canContactSupport && (
          <Link
            href={SUPPORT_HREF}
            className="inline-flex items-center rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-bg hover:bg-accent-hover"
          >
            Contactar soporte
          </Link>
        )}
      </div>

      <p className="mt-4 font-mono text-xs text-text-muted">
        Pedido {status.orderId.slice(0, 8)}…
        {status.paymentId ? ` · Pago ${status.paymentId.slice(0, 8)}…` : ''}
        {status.paymentProvider ? ` · ${status.paymentProvider}` : ''}
      </p>
    </div>
  );
}
