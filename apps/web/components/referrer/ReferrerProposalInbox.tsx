'use client';

import { useState } from 'react';
import {
  Button,
  Modal,
  QueryError,
  Skeleton,
  useToast,
} from '@/components';
import { ReferrerLegalDisclaimer } from '@/components/referrer/ReferrerLegalDisclaimer';
import {
  useAcceptReferralProposal,
  useRejectReferralProposal,
  useReferrerProposals,
} from '@/hooks/useReferrerProposals';
import {
  REFERRAL_PROPOSAL_ACCEPT_DISCLAIMER,
  commissionTypeLabel,
  formatCommissionValue,
  proposalStatusLabel,
} from '@/lib/producer/referral-display';
import { getErrorMessage } from '@/lib/errors';
import type { ReferralCommercialProposalDto } from '@/repositories/interfaces';

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

function ProposalCard({
  proposal,
  expanded,
  onToggle,
  onAccept,
  onReject,
  busyAccept,
  busyReject,
}: {
  proposal: ReferralCommercialProposalDto;
  expanded: boolean;
  onToggle: () => void;
  onAccept: () => void;
  onReject: () => void;
  busyAccept: boolean;
  busyReject: boolean;
}) {
  return (
    <li className="rounded-xl border border-border bg-bg-muted/30 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(proposal.status)}`}
            >
              {proposalStatusLabel(proposal.status)}
            </span>
            <span className="text-xs text-text-muted">
              {new Date(proposal.createdAt).toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
          <p className="mt-2 font-semibold text-text">
            {proposal.producerProfile?.displayName ?? 'Productora'}
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Evento: <span className="text-text">{proposal.event?.title ?? proposal.eventId}</span>
          </p>
          <p className="mt-2 text-sm text-text">
            {commissionTypeLabel(proposal.commissionType)}:{' '}
            <span className="font-medium text-accent">
              {formatCommissionValue(proposal.commissionType, proposal.commissionValue)}
            </span>
          </p>
          {proposal.message && (
            <p className="mt-2 text-sm text-text-muted line-clamp-2">{proposal.message}</p>
          )}
          {proposal.status === 'ACCEPTED' && proposal.agreement?.referralLink && (
            <p className="mt-2 font-mono text-xs text-accent">
              Link activo: {proposal.agreement.referralLink.code}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={onToggle}>
            {expanded ? 'Ocultar detalle' : 'Ver detalle'}
          </Button>
          {proposal.status === 'PENDING' && (
            <>
              <Button type="button" size="sm" disabled={busyReject} variant="outline" onClick={onReject}>
                {busyReject ? 'Rechazando…' : 'Rechazar'}
              </Button>
              <Button type="button" size="sm" disabled={busyAccept} onClick={onAccept}>
                {busyAccept ? 'Aceptando…' : 'Aceptar'}
              </Button>
            </>
          )}
        </div>
      </div>
      {expanded && (
        <div className="mt-4 space-y-3 border-t border-border pt-4 text-sm">
          {proposal.terms ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Términos</p>
              <p className="mt-1 whitespace-pre-wrap text-text-muted">{proposal.terms}</p>
            </div>
          ) : null}
          {proposal.message ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Mensaje</p>
              <p className="mt-1 whitespace-pre-wrap text-text">{proposal.message}</p>
            </div>
          ) : null}
          {(proposal.startAt || proposal.endAt) && (
            <p className="text-text-muted">
              Vigencia:{' '}
              {proposal.startAt
                ? new Date(proposal.startAt).toLocaleDateString('es-AR')
                : 'sin inicio'}{' '}
              —{' '}
              {proposal.endAt ? new Date(proposal.endAt).toLocaleDateString('es-AR') : 'sin fin'}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

export function ReferrerProposalInbox() {
  const { addToast } = useToast();
  const { data, isLoading, isError, error, refetch } = useReferrerProposals();
  const acceptMutation = useAcceptReferralProposal();
  const rejectMutation = useRejectReferralProposal();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [acceptTarget, setAcceptTarget] = useState<ReferralCommercialProposalDto | null>(null);
  const [acceptAck, setAcceptAck] = useState(false);

  const proposals: ReferralCommercialProposalDto[] = data?.proposals ?? [];
  const pending = proposals.filter((p: ReferralCommercialProposalDto) => p.status === 'PENDING');
  const rest = proposals.filter((p: ReferralCommercialProposalDto) => p.status !== 'PENDING');

  const handleReject = (id: string) => {
    rejectMutation.mutate(id, {
      onSuccess: () => addToast('Propuesta rechazada', 'success'),
      onError: (e) => addToast(getErrorMessage(e), 'error'),
    });
  };

  const handleAcceptConfirm = () => {
    if (!acceptTarget || !acceptAck) return;
    acceptMutation.mutate(acceptTarget.id, {
      onSuccess: (res) => {
        addToast('Propuesta aceptada. Tu link de referido quedó activo.', 'success');
        setAcceptTarget(null);
        setAcceptAck(false);
        if (res.agreement?.referralLink?.code) {
          setExpandedId(acceptTarget.id);
        }
      },
      onError: (e) => addToast(getErrorMessage(e), 'error'),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return <QueryError message={getErrorMessage(error)} onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          Pendientes de tu respuesta
        </h3>
        {pending.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-text-muted">
            No tenés propuestas comerciales pendientes.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {pending.map((p: ReferralCommercialProposalDto) => (
              <ProposalCard
                key={p.id}
                proposal={p}
                expanded={expandedId === p.id}
                onToggle={() => setExpandedId((id) => (id === p.id ? null : p.id))}
                onAccept={() => {
                  setAcceptAck(false);
                  setAcceptTarget(p);
                }}
                onReject={() => handleReject(p.id)}
                busyAccept={acceptMutation.isPending && acceptTarget?.id === p.id}
                busyReject={rejectMutation.isPending}
              />
            ))}
          </ul>
        )}
      </div>

      {rest.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Historial</h3>
          <ul className="mt-3 space-y-3">
            {rest.map((p: ReferralCommercialProposalDto) => (
              <ProposalCard
                key={p.id}
                proposal={p}
                expanded={expandedId === p.id}
                onToggle={() => setExpandedId((id) => (id === p.id ? null : p.id))}
                onAccept={() => {}}
                onReject={() => {}}
                busyAccept={false}
                busyReject={false}
              />
            ))}
          </ul>
        </div>
      )}

      <Modal
        isOpen={!!acceptTarget}
        onClose={() => {
          if (!acceptMutation.isPending) {
            setAcceptTarget(null);
            setAcceptAck(false);
          }
        }}
        title="Confirmar aceptación"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={acceptMutation.isPending}
              onClick={() => {
                setAcceptTarget(null);
                setAcceptAck(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!acceptAck || acceptMutation.isPending}
              onClick={handleAcceptConfirm}
            >
              {acceptMutation.isPending ? 'Aceptando…' : 'Aceptar propuesta'}
            </Button>
          </>
        }
      >
        {acceptTarget && (
          <div className="space-y-4 text-sm">
            <p className="text-text">
              Vas a aceptar la propuesta de{' '}
              <span className="font-medium">{acceptTarget.producerProfile?.displayName}</span> para el
              evento <span className="font-medium">{acceptTarget.event?.title}</span> con comisión{' '}
              {formatCommissionValue(acceptTarget.commissionType, acceptTarget.commissionValue)}.
            </p>
            <p className="text-text-muted">{REFERRAL_PROPOSAL_ACCEPT_DISCLAIMER}</p>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-bg-muted/40 p-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={acceptAck}
                onChange={(e) => setAcceptAck(e.target.checked)}
              />
              <span className="text-text-muted">
                Entiendo que el pago es un acuerdo directo con la productora y que la plataforma no
                administra ni garantiza esos pagos.
              </span>
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}
