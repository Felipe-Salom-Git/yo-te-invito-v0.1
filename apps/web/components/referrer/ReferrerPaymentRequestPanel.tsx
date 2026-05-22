'use client';

import { useMemo, useState } from 'react';
import {
  Button,
  Input,
  Modal,
  QueryError,
  Skeleton,
  useToast,
} from '@/components';
import { ReferrerLegalDisclaimer } from '@/components/referrer/ReferrerLegalDisclaimer';
import {
  useCancelReferrerPaymentRequest,
  useCreateReferrerPaymentRequest,
  useReferrerEligibleCommissions,
  useReferrerPaymentRequests,
} from '@/hooks/useReferrerPaymentRequests';
import {
  formatMoneyCents,
  paymentRequestStatusLabel,
  REFERRAL_PAYMENT_REQUEST_DISCLAIMER_REFERRER,
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

function PaymentRequestCard({
  request,
  onCancel,
  cancelBusy,
}: {
  request: ReferralPaymentRequestDto;
  onCancel?: () => void;
  cancelBusy?: boolean;
}) {
  return (
    <li className="rounded-xl border border-border bg-bg-muted/30 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(request.status)}`}
        >
          {paymentRequestStatusLabel(request.status)}
        </span>
        <span className="text-xs text-text-muted">
          {new Date(request.requestedAt).toLocaleDateString('es-AR')}
        </span>
      </div>
      <p className="mt-2 font-semibold text-text">
        {request.producerProfile?.displayName ?? 'Productora'} ·{' '}
        <span className="text-accent">{formatMoneyCents(request.amountRequestedCents)}</span>
      </p>
      <p className="mt-1 text-xs text-text-muted">
        {request.commissions?.length ?? 0} comisión(es) incluida(s)
      </p>
      {request.message && (
        <p className="mt-2 text-sm text-text-muted line-clamp-2">{request.message}</p>
      )}
      {request.rejectReason && (
        <p className="mt-2 text-sm text-red-300/90">Motivo: {request.rejectReason}</p>
      )}
      {request.status === 'REQUESTED' && onCancel && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3"
          disabled={cancelBusy}
          onClick={onCancel}
        >
          {cancelBusy ? 'Cancelando…' : 'Cancelar solicitud'}
        </Button>
      )}
    </li>
  );
}

export function ReferrerPaymentRequestPanel() {
  const { addToast } = useToast();
  const eligibleQuery = useReferrerEligibleCommissions();
  const requestsQuery = useReferrerPaymentRequests();
  const createMutation = useCreateReferrerPaymentRequest();
  const cancelMutation = useCancelReferrerPaymentRequest();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);

  const commissions = eligibleQuery.data?.commissions ?? [];
  const requests = requestsQuery.data?.paymentRequests ?? [];

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { producerName: string; items: typeof commissions }
    >();
    for (const c of commissions) {
      const pid = c.producerProfileId ?? 'unknown';
      const cur = map.get(pid) ?? {
        producerName: c.producerDisplayName ?? 'Productora',
        items: [],
      };
      cur.items.push(c);
      map.set(pid, cur);
    }
    return Array.from(map.values());
  }, [commissions]);

  const selectedTotal = useMemo(() => {
    return commissions
      .filter((c) => selectedIds.has(c.id))
      .reduce((s, c) => s + c.amountCents, 0);
  }, [commissions, selectedIds]);

  const toggleCommission = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleProducerGroup = (ids: string[]) => {
    const allSelected = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (selectedIds.size === 0) return;
    createMutation.mutate(
      {
        commissionIds: Array.from(selectedIds),
        message: message.trim() || undefined,
      },
      {
        onSuccess: () => {
          addToast('Solicitud de pago enviada a la productora', 'success');
          setSelectedIds(new Set());
          setMessage('');
          setShowConfirm(false);
        },
        onError: (e) => addToast(getErrorMessage(e), 'error'),
      },
    );
  };

  const isLoading = eligibleQuery.isLoading || requestsQuery.isLoading;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (eligibleQuery.isError || requestsQuery.isError) {
    return (
      <QueryError
        message={getErrorMessage(eligibleQuery.error ?? requestsQuery.error)}
        onRetry={() => {
          void eligibleQuery.refetch();
          void requestsQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          Solicitar pago a la productora
        </h3>
        <p className="mt-1 text-sm text-text-muted">
          Seleccioná comisiones generadas confirmadas. El cobro real es entre ustedes; la plataforma
          solo registra la solicitud.
        </p>

        {grouped.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-text-muted">
            No tenés comisiones liquidables para solicitar. Aparecen cuando haya ventas confirmadas
            según tus acuerdos.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {grouped.map((group) => {
              const ids = group.items.map((c) => c.id);
              const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));
              return (
                <div
                  key={group.producerName}
                  className="rounded-xl border border-border bg-bg-muted/20 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-text">{group.producerName}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleProducerGroup(ids)}
                    >
                      {allSelected ? 'Quitar todas' : 'Seleccionar todas'}
                    </Button>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {group.items.map((c) => (
                      <li key={c.id}>
                        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-bg px-3 py-2">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={selectedIds.has(c.id)}
                            onChange={() => toggleCommission(c.id)}
                          />
                          <span className="min-w-0 flex-1 text-sm">
                            <span className="text-text">{c.eventTitle ?? c.eventId}</span>
                            {c.referralCode && (
                              <span className="ml-2 font-mono text-xs text-accent">{c.referralCode}</span>
                            )}
                            <span className="mt-0.5 block text-accent font-medium">
                              {formatMoneyCents(c.amountCents)}
                            </span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}

            <div className="rounded-xl border border-accent/25 bg-accent/5 p-4">
              <p className="text-sm text-text-muted">
                Monto a solicitar a la productora:{' '}
                <span className="text-lg font-semibold text-accent">
                  {formatMoneyCents(selectedTotal)}
                </span>
              </p>
              <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-text-muted">
                Mensaje opcional
              </label>
              <Input
                className="mt-1"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ej. factura enviada por email…"
              />
              <Button
                type="button"
                className="mt-4 w-full sm:w-auto"
                disabled={selectedIds.size === 0}
                onClick={() => setShowConfirm(true)}
              >
                Enviar solicitud de pago
              </Button>
            </div>
          </div>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          Solicitudes enviadas
        </h3>
        {requests.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">Todavía no enviaste solicitudes de pago.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {requests.map((r) => (
              <PaymentRequestCard
                key={r.id}
                request={r}
                onCancel={() => setCancelTargetId(r.id)}
                cancelBusy={cancelMutation.isPending && cancelTargetId === r.id}
              />
            ))}
          </ul>
        )}
      </section>

      <Modal
        isOpen={showConfirm}
        onClose={() => {
          if (!createMutation.isPending) setShowConfirm(false);
        }}
        title="Confirmar solicitud de pago"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={createMutation.isPending}
              onClick={() => setShowConfirm(false)}
            >
              Volver
            </Button>
            <Button type="button" disabled={createMutation.isPending} onClick={handleSubmit}>
              {createMutation.isPending ? 'Enviando…' : 'Confirmar envío'}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <p className="font-medium text-amber-200/90">{REFERRAL_PAYMENT_REQUEST_DISCLAIMER_REFERRER}</p>
          <ReferrerLegalDisclaimer variant="compact" />
          <p className="text-text-muted">
            Total: <span className="text-text font-semibold">{formatMoneyCents(selectedTotal)}</span>{' '}
            · {selectedIds.size} comisión(es)
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={!!cancelTargetId}
        onClose={() => {
          if (!cancelMutation.isPending) setCancelTargetId(null);
        }}
        title="Cancelar solicitud"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={cancelMutation.isPending}
              onClick={() => setCancelTargetId(null)}
            >
              Volver
            </Button>
            <Button
              type="button"
              disabled={cancelMutation.isPending}
              onClick={() => {
                if (!cancelTargetId) return;
                cancelMutation.mutate(cancelTargetId, {
                  onSuccess: () => {
                    addToast('Solicitud cancelada', 'success');
                    setCancelTargetId(null);
                  },
                  onError: (e) => addToast(getErrorMessage(e), 'error'),
                });
              }}
            >
              {cancelMutation.isPending ? 'Cancelando…' : 'Confirmar cancelación'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          La productora ya no verá esta solicitud como pendiente.
        </p>
      </Modal>
    </div>
  );
}
