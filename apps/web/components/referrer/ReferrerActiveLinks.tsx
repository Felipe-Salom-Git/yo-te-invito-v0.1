'use client';

import Link from 'next/link';
import { Button, QueryError, Skeleton } from '@/components';
import { CopyReferralLinkButton } from '@/components/producer/referrals/CopyReferralLinkButton';
import { useReferrerLinks } from '@/hooks/useReferrerLinks';
import { agreementStatusLabel, formatMoneyCents } from '@/lib/producer/referral-display';
import { getErrorMessage } from '@/lib/errors';

export function ReferrerActiveLinks() {
  const { links, isLoading, isError, error, refetch } = useReferrerLinks();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return <QueryError message={getErrorMessage(error)} onRetry={() => void refetch()} />;
  }

  if (links.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
        <p className="font-medium text-text">Sin links activos</p>
        <p className="mt-2 text-sm text-text-muted">
          Cuando aceptes una propuesta comercial o una productora te asigne a un evento, tu link de
          venta aparecerá acá.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {links.map((row) => (
        <li
          key={`${row.linkId}-${row.code}`}
          className="rounded-xl border border-border bg-bg-muted/30 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium text-text">{row.eventTitle}</p>
            {row.producerName && (
              <p className="mt-0.5 text-sm text-text-muted">Productora: {row.producerName}</p>
            )}
            <p className="mt-2 font-mono text-xs text-accent break-all">{row.url}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
              <span>
                Código: <span className="font-mono text-accent">{row.code}</span>
              </span>
              {row.commissionLabel && (
                <span>
                  Comisión pactada: <span className="text-text">{row.commissionLabel}</span>
                </span>
              )}
              {row.agreementStatus && (
                <span>
                  Acuerdo:{' '}
                  <span className="text-text">{agreementStatusLabel(row.agreementStatus)}</span>
                </span>
              )}
              {row.paidOrders > 0 && (
                <span>
                  Ventas PAID: {row.paidOrders} · Tickets: {row.ticketsSold} ·{' '}
                  {formatMoneyCents(row.grossRevenueCents)} atribuido
                </span>
              )}
            </div>
          </div>
          <div className="mt-3 flex shrink-0 flex-wrap gap-2 sm:mt-0">
            <CopyReferralLinkButton text={row.url} />
            <Link href={`/events/${row.eventId}`}>
              <Button type="button" size="sm" variant="ghost">
                Ver evento
              </Button>
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
