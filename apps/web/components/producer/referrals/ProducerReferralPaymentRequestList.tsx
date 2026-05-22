'use client';

import { useState } from 'react';
import {
  Button,
  Input,
  Modal,
  QueryError,
  Skeleton,
  useToast,
} from '@/components';
import { ReferralLegalDisclaimer } from '@/components/producer/referrals/ReferralLegalDisclaimer';
import {
  useMarkProducerPaymentRequestInReview,
  useMarkProducerPaymentRequestPaid,
  useProducerPaymentRequests,
  useRejectProducerPaymentRequest,
} from '@/hooks/useProducerPaymentRequests';
import {
  formatMoneyCents,
  paymentRequestStatusLabel,
  REFERRAL_PAYMENT_REQUEST_DISCLAIMER_PRODUCER,
} from '@/lib/producer/referral-display';
import { getErrorMessage } from '@/lib/errors';
import type { ReferralPaymentRequestDto } from '@/repositories/interfaces';

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'REQUESTED':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200/90';
    case 'IN_REVIEW':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-200/90';
    case 'PAID':
      return 'border-accent/30 bg-accent/10 text-accent-soft';
    case 'REJECTED':
    case 'CANCELLED':
      return 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400';
    default:
      return 'border-border text-text-muted';
  }
}

function PaymentRequestDetail({
  request,
  onClose,
}: {
  request: ReferralPaymentRequestDto;
  onClose: () => void;
}) {
  const { addToast } = useToast();
  const inReviewMutation = useMarkProducerPaymentRequestInReview();
  const paidMutation = useMarkProducerPaymentRequestPaid();
  const rejectMutation = useRejectProducerPaymentRequest();
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [showPaidConfirm, setShowPaidConfirm] = useState(false);

  const busy =
    inReviewMutation.isPending || paidMutation.isPending || rejectMutation.isPending;

  const canAct = request.status === 'REQUESTED' || request.status === 'IN_REVIEW';

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span
            className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(request.status)}`}
          >
            {paymentRequestStatusLabel(request.status)}
          </span>
          <p className="mt-2 font-semibold text-text">
            {request.referrerProfile?.displayName ?? 'Referido'}
          </p>
          <p className="text-sm text-accent font-medium">
            {formatMoneyCents(request.amountRequestedCents)}
          </p>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          Cerrar
        </Button>
      </div>

      {request.message && (
        <p className="text-sm text-text-muted">
          <span className="font-medium text-text">Mensaje del referido:</span> {request.message}
        </p>
      )}

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Comisiones incluidas
        </p>
        <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
          {(request.commissions ?? []).map((c) => (
            <li
              key={c.id}
              className="flex justify-between gap-2 rounded-lg border border-border bg-bg-muted/40 px-3 py-2 text-sm"
            >
              <span className="text-text-muted">
                {c.eventTitle ?? c.eventId}
                {c.referralCode ? ` · ${c.referralCode}` : ''}
              </span>
              <span className="font-medium text-accent">{formatMoneyCents(c.amountCents)}</span>
            </li>
          ))}
        </ul>
      </div>

      {canAct && (
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          {request.status === 'REQUESTED' && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                inReviewMutation.mutate(request.id, {
                  onSuccess: () => addToast('Marcada en revisión', 'success'),
                  onError: (e) => addToast(getErrorMessage(e), 'error'),
                })
              }
            >
              Marcar en revisión
            </Button>
          )}
          <Button type="button" size="sm" disabled={busy} onClick={() => setShowPaidConfirm(true)}>
            Marcar como pagado externamente
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => setShowReject(true)}
          >
            Rechazar
          </Button>
        </div>
      )}

      <Modal
        isOpen={showPaidConfirm}
        onClose={() => !paidMutation.isPending && setShowPaidConfirm(false)}
        title="Registrar pago externo"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={paidMutation.isPending}
              onClick={() => setShowPaidConfirm(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={paidMutation.isPending}
              onClick={() =>
                paidMutation.mutate(request.id, {
                  onSuccess: () => {
                    addToast('Pago externo registrado', 'success');
                    setShowPaidConfirm(false);
                    onClose();
                  },
                  onError: (e) => addToast(getErrorMessage(e), 'error'),
                })
              }
            >
              {paidMutation.isPending ? 'Guardando…' : 'Confirmar'}
            </Button>
          </>
        }
      >
        <p className="text-sm font-medium text-amber-200/90">
          {REFERRAL_PAYMENT_REQUEST_DISCLAIMER_PRODUCER}
        </p>
        <ReferralLegalDisclaimer variant="compact" className="mt-3" />
      </Modal>

      <Modal
        isOpen={showReject}
        onClose={() => !rejectMutation.isPending && setShowReject(false)}
        title="Rechazar solicitud"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={rejectMutation.isPending}
              onClick={() => setShowReject(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={rejectMutation.isPending || !rejectReason.trim()}
              onClick={() =>
                rejectMutation.mutate(
                  { id: request.id, body: { reason: rejectReason.trim() } },
                  {
                    onSuccess: () => {
                      addToast('Solicitud rechazada', 'success');
                      setShowReject(false);
                      onClose();
                    },
                    onError: (e) => addToast(getErrorMessage(e), 'error'),
                  },
                )
              }
            >
              {rejectMutation.isPending ? 'Guardando…' : 'Rechazar'}
            </Button>
          </>
        }
      >
        <label className="block text-xs font-medium uppercase tracking-wide text-text-muted">
          Motivo
        </label>
        <Input
          className="mt-1"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Indicá el motivo para el referido"
        />
      </Modal>
    </div>
  );
}

export function ProducerReferralPaymentRequestList() {
  const { data, isLoading, isError, error, refetch } = useProducerPaymentRequests();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const requests = data?.paymentRequests ?? [];
  const selected = selectedId ? requests.find((r) => r.id === selectedId) : null;

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

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
        <p className="font-medium text-text">Sin solicitudes de pago</p>
        <p className="mt-2 text-sm text-text-muted">
          Cuando un referido solicite el pago de comisiones generadas, aparecerán acá.
        </p>
      </div>
    );
  }

  const openCount = requests.filter((r) => r.status === 'REQUESTED' || r.status === 'IN_REVIEW').length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        {openCount > 0
          ? `${openCount} solicitud(es) pendiente(s) de gestión.`
          : 'No hay solicitudes abiertas.'}
      </p>
      <p className="text-sm font-medium text-amber-200/90">
        {REFERRAL_PAYMENT_REQUEST_DISCLAIMER_PRODUCER}
      </p>
      <ReferralLegalDisclaimer variant="compact" />

      <div className="grid gap-4 lg:grid-cols-2">
        <ul className="space-y-3">
          {requests.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setSelectedId(r.id)}
                className={`w-full rounded-xl border p-4 text-left transition-colors ${
                  selectedId === r.id
                    ? 'border-accent/50 bg-accent/5'
                    : 'border-border bg-bg-muted/30 hover:border-accent/30'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(r.status)}`}
                  >
                    {paymentRequestStatusLabel(r.status)}
                  </span>
                  <span className="text-xs text-text-muted">
                    {new Date(r.requestedAt).toLocaleDateString('es-AR')}
                  </span>
                </div>
                <p className="mt-2 font-medium text-text">
                  {r.referrerProfile?.displayName ?? 'Referido'}
                </p>
                <p className="text-sm text-accent">{formatMoneyCents(r.amountRequestedCents)}</p>
              </button>
            </li>
          ))}
        </ul>
        <div className="rounded-xl border border-border bg-bg-muted/30 p-4 lg:min-h-[280px]">
          {selected ? (
            <PaymentRequestDetail request={selected} onClose={() => setSelectedId(null)} />
          ) : (
            <p className="text-sm text-text-muted">Seleccioná una solicitud para ver el detalle.</p>
          )}
        </div>
      </div>
    </div>
  );
}
