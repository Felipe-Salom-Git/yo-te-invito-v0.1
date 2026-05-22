'use client';

import { useMemo } from 'react';
import type { ReferralCommercialProposalDto } from '@/repositories/interfaces';
import { formatMoneyCents } from '@/lib/producer/referral-display';

type Props = {
  proposals: ReferralCommercialProposalDto[];
  paymentRequestsPending?: number;
  commissionsGeneratedCents?: number;
  className?: string;
};

export function ProducerReferralAgreementSummary({
  proposals,
  paymentRequestsPending = 0,
  commissionsGeneratedCents,
  className = '',
}: Props) {
  const stats = useMemo(() => {
    let pending = 0;
    let activeAgreements = 0;
    let rejectedOrCancelled = 0;
    for (const p of proposals) {
      if (p.status === 'PENDING') pending++;
      else if (p.status === 'ACCEPTED' && p.agreement?.status === 'ACTIVE') activeAgreements++;
      else if (p.status === 'REJECTED' || p.status === 'CANCELLED' || p.status === 'EXPIRED') {
        rejectedOrCancelled++;
      }
    }
    return { pending, activeAgreements, rejectedOrCancelled };
  }, [proposals]);

  const cards = [
    {
      label: 'Propuestas pendientes',
      value: String(stats.pending),
      hint: 'Esperando respuesta del referido',
    },
    {
      label: 'Acuerdos activos',
      value: String(stats.activeAgreements),
      hint: 'Propuesta aceptada con link vigente',
    },
    {
      label: 'Comisión generada',
      value:
        commissionsGeneratedCents != null
          ? formatMoneyCents(commissionsGeneratedCents)
          : '—',
      hint: 'Según ventas atribuidas (referencia)',
      accent: true,
    },
    {
      label: 'Solicitudes de pago',
      value: String(paymentRequestsPending),
      hint: 'Pendientes de revisión (por evento)',
    },
  ];

  return (
    <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {cards.map((c) => (
        <div
          key={c.label}
          className={`rounded-xl border px-4 py-4 ${
            c.accent ? 'border-accent/30 bg-accent/5' : 'border-border bg-bg-muted/40'
          }`}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{c.label}</p>
          <p className={`mt-2 text-2xl font-semibold ${c.accent ? 'text-accent' : 'text-text'}`}>
            {c.value}
          </p>
          <p className="mt-1 text-xs text-text-muted">{c.hint}</p>
        </div>
      ))}
    </div>
  );
}
