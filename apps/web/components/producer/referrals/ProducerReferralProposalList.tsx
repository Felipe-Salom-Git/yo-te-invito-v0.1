'use client';

import type { ReferralCommercialProposalDto } from '@/repositories/interfaces';
import {
  commissionTypeLabel,
  formatCommissionValue,
  proposalStatusLabel,
} from '@/lib/producer/referral-display';
import { Button } from '@/components';

type Props = {
  proposals: ReferralCommercialProposalDto[];
  onCancel?: (proposalId: string) => void;
  cancelBusyId?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
};

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200/90';
    case 'ACCEPTED':
      return 'border-accent/30 bg-accent/10 text-accent-soft';
    case 'REJECTED':
    case 'CANCELLED':
    case 'EXPIRED':
      return 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400';
    default:
      return 'border-border text-text-muted';
  }
}

export function ProducerReferralProposalList({
  proposals,
  onCancel,
  cancelBusyId,
  emptyTitle = 'Sin propuestas enviadas',
  emptyDescription = 'Cuando envíes una propuesta comercial a un referido, aparecerá acá.',
}: Props) {
  if (proposals.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
        <p className="font-medium text-text">{emptyTitle}</p>
        <p className="mt-2 text-sm text-text-muted">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {proposals.map((p) => (
        <li
          key={p.id}
          className="rounded-xl border border-border bg-bg-muted/30 p-4 sm:p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(p.status)}`}
                >
                  {proposalStatusLabel(p.status)}
                </span>
                <span className="text-xs text-text-muted">
                  {new Date(p.createdAt).toLocaleDateString('es-AR')}
                </span>
              </div>
              <p className="mt-2 font-semibold text-text">
                {p.referrerProfile?.displayName ?? 'Referido'}
                {p.referrerProfile?.publicHandle ? (
                  <span className="ml-2 font-mono text-xs font-normal text-accent">
                    @{p.referrerProfile.publicHandle}
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-sm text-text-muted">
                Evento: <span className="text-text">{p.event?.title ?? p.eventId}</span>
              </p>
              <p className="mt-2 text-sm text-text">
                Comisión por entrada ·{' '}
                <span className="font-medium text-accent">
                  {commissionTypeLabel(p.commissionType)}:{' '}
                  {formatCommissionValue(p.commissionType, p.commissionValue)}
                </span>
              </p>
              {p.message && (
                <p className="mt-2 line-clamp-2 text-sm text-text-muted">{p.message}</p>
              )}
              {p.status === 'ACCEPTED' && p.agreement?.referralLink && (
                <p className="mt-2 font-mono text-xs text-accent">
                  Link: {p.agreement.referralLink.code}
                </p>
              )}
            </div>
            {p.status === 'PENDING' && onCancel && (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                disabled={cancelBusyId === p.id}
                onClick={() => onCancel(p.id)}
              >
                {cancelBusyId === p.id ? 'Cancelando…' : 'Cancelar propuesta'}
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
