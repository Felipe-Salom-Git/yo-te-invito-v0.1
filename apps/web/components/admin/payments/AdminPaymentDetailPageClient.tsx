'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  PageContainer,
  SectionTitle,
  PageLoader,
  QueryError,
  Button,
  Input,
} from '@/components';
import { getErrorMessage } from '@/lib/errors';
import {
  useAdminPaymentDetail,
  useMarkAdminPaymentReviewed,
  useReconcileAdminPayment,
} from '@/lib/query/admin-payments';
import {
  AdminManualReviewBadge,
  AdminPaymentProviderBadge,
  AdminPaymentStatusBadge,
} from './AdminPaymentBadges';

const MANUAL_REVIEW_COPY =
  'Este pago requiere revisión manual. La pasarela informó una operación aprobada, pero la orden local no pudo completarse automáticamente. No emitas tickets ni gestiones devoluciones desde esta pantalla sin validar el caso.';

const EXPIRED_APPROVED_COPY =
  'La orden estaba expirada cuando Getnet informó el pago aprobado. Es posible que el stock reservado ya haya sido liberado. Revisá disponibilidad, contacto con comprador y política operativa antes de resolver.';

function formatMoney(amount: number, currency: string) {
  return `${currency} ${(amount / 100).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

function copyText(text: string) {
  void navigator.clipboard.writeText(text);
}

type Props = {
  paymentId: string;
};

export function AdminPaymentDetailPageClient({ paymentId }: Props) {
  const { data: session, status } = useSession();
  const detailQuery = useAdminPaymentDetail(paymentId, status === 'authenticated');
  const reconcile = useReconcileAdminPayment();
  const markReviewed = useMarkAdminPaymentReviewed();
  const [note, setNote] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);

  const p = detailQuery.data;

  if (status === 'loading' || detailQuery.isLoading) {
    return (
      <PageContainer>
        <PageLoader message="Cargando pago…" />
      </PageContainer>
    );
  }

  if (!session?.user) {
    return (
      <PageContainer>
        <p className="text-text-muted">Debés iniciar sesión como administrador.</p>
      </PageContainer>
    );
  }

  if (detailQuery.isError || !p) {
    return (
      <PageContainer>
        <QueryError
          message={getErrorMessage(detailQuery.error) ?? 'Pago no encontrado'}
          onRetry={() => detailQuery.refetch()}
        />
      </PageContainer>
    );
  }

  const isExpiredApproved = p.reconciliationReason === 'ORDER_EXPIRED_PAYMENT_APPROVED';

  return (
    <PageContainer>
      <Link
        href="/admin/pagos"
        className="mb-4 inline-block text-sm text-text-muted hover:text-text"
      >
        ← Pagos
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <SectionTitle>Detalle del pago</SectionTitle>
          <p className="mt-1 font-mono text-xs text-text-muted">{p.id}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <AdminPaymentProviderBadge provider={p.provider} />
            <AdminPaymentStatusBadge status={p.status} />
            {p.requiresManualReview ? <AdminManualReviewBadge /> : null}
          </div>
        </div>
        <p className="text-lg font-semibold tabular-nums text-accent">
          {formatMoney(p.amount, p.currency)}
        </p>
      </header>

      {p.requiresManualReview ? (
        <div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p>{MANUAL_REVIEW_COPY}</p>
          {isExpiredApproved ? <p className="mt-3">{EXPIRED_APPROVED_COPY}</p> : null}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {p.canReconcile ? (
          <Button
            variant="outline"
            disabled={reconcile.isPending}
            onClick={() => {
              if (!window.confirm('¿Reconciliar con Getnet?')) return;
              reconcile.mutate(paymentId);
            }}
          >
            {reconcile.isPending ? 'Reconciliando…' : 'Reconciliar'}
          </Button>
        ) : null}
        {p.canMarkReviewed ? (
          <Button onClick={() => setShowNoteModal(true)}>Marcar como revisado</Button>
        ) : null}
        <Button variant="outline" type="button" onClick={() => copyText(p.id)}>
          Copiar payment ID
        </Button>
        {p.orderId ? (
          <Button variant="outline" type="button" onClick={() => copyText(p.orderId!)}>
            Copiar order ID
          </Button>
        ) : null}
        {p.orderId ? (
          <Link
            href={`/checkout/return?orderId=${encodeURIComponent(p.orderId)}&paymentId=${encodeURIComponent(p.id)}&tenantId=${encodeURIComponent(p.tenantId)}`}
            className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm text-text hover:border-accent/50"
          >
            Vista comprador
          </Link>
        ) : null}
      </div>

      {reconcile.isSuccess ? (
        <p className="mt-4 text-sm text-accent">
          Outcome: {reconcile.data.outcome}
          {reconcile.data.fulfillOutcome ? ` · fulfill: ${reconcile.data.fulfillOutcome}` : ''}
        </p>
      ) : null}
      {reconcile.isError ? (
        <p className="mt-4 text-sm text-red-400">{getErrorMessage(reconcile.error)}</p>
      ) : null}
      {markReviewed.isError ? (
        <p className="mt-4 text-sm text-red-400">{getErrorMessage(markReviewed.error)}</p>
      ) : null}
      {markReviewed.isSuccess ? (
        <p className="mt-4 text-sm text-accent">Caso marcado como revisado.</p>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border/80 bg-bg-muted/30 p-4">
          <h3 className="font-medium text-text">Orden y comprador</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-text-muted">Orden</dt>
              <dd className="font-mono text-xs break-all">{p.orderId ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Estado orden</dt>
              <dd>{p.orderStatus ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Evento</dt>
              <dd>{p.eventTitle ?? p.eventId ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Comprador</dt>
              <dd>{p.buyerEmail ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Tickets emitidos</dt>
              <dd>
                {p.ticketCount} {p.ticketsIssued ? '(sí)' : '(no)'}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-border/80 bg-bg-muted/30 p-4">
          <h3 className="font-medium text-text">Getnet / reconciliación</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-text-muted">Referencia externa</dt>
              <dd className="font-mono text-xs break-all">{p.externalReference ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-text-muted">External payment ID</dt>
              <dd className="font-mono text-xs break-all">{p.externalPaymentId ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Reconciliación</dt>
              <dd>{p.reconciliationStatus ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Motivo</dt>
              <dd>{p.reconciliationReason ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Último outcome</dt>
              <dd>{p.lastReconciliationOutcome ?? '—'}</dd>
            </div>
            {p.reconciliationReviewedAt ? (
              <div>
                <dt className="text-text-muted">Revisado</dt>
                <dd>
                  {new Date(p.reconciliationReviewedAt).toLocaleString('es-AR')}
                  {p.reconciliationReviewedNote
                    ? ` — ${p.reconciliationReviewedNote}`
                    : ''}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      </div>

      {p.orderItems.length > 0 ? (
        <section className="mt-6 rounded-xl border border-border/80 bg-bg-muted/30 p-4">
          <h3 className="font-medium text-text">Ítems</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {p.orderItems.map((oi) => (
              <li key={oi.id}>
                {oi.quantity}× {oi.ticketTypeName} — {oi.unitPrice}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {p.webhookEvents.length > 0 ? (
        <section className="mt-6 rounded-xl border border-border/80 bg-bg-muted/30 p-4">
          <h3 className="font-medium text-text">Eventos webhook (sanitizados)</h3>
          <ul className="mt-3 space-y-3">
            {p.webhookEvents.map((ev, i) => (
              <li
                key={`${ev.idempotencyKey}-${i}`}
                className="rounded-lg border border-border/50 bg-bg/40 p-3 text-xs"
              >
                <p>
                  <span className="text-text-muted">{ev.receivedAt}</span> ·{' '}
                  <span className="text-text">{ev.remoteStatus}</span> → {ev.processedOutcome}
                </p>
                <p className="mt-1 font-mono text-text-muted">
                  {ev.eventId ?? 'sin eventId'} · {ev.idempotencyKey.slice(0, 24)}…
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {Object.keys(p.operationalMetadata).length > 0 ? (
        <section className="mt-6 rounded-xl border border-border/80 bg-bg-muted/30 p-4">
          <h3 className="font-medium text-text">Metadata operativa</h3>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-bg/60 p-3 text-xs text-text-muted">
            {JSON.stringify(p.operationalMetadata, null, 2)}
          </pre>
        </section>
      ) : null}

      {showNoteModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-bg p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-text">Agregar nota interna de revisión</h3>
            <p className="mt-2 text-sm text-text-muted">
              Marca el caso como revisado sin emitir tickets ni reembolsar.
            </p>
            <div className="mt-4">
              <Input
                label="Nota (opcional)"
                name="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNoteModal(false)}>
                Cancelar
              </Button>
              <Button
                disabled={markReviewed.isPending}
                onClick={() => {
                  markReviewed.mutate(
                    { paymentId, input: { note: note.trim() || undefined } },
                    { onSuccess: () => setShowNoteModal(false) },
                  );
                }}
              >
                {markReviewed.isPending ? 'Guardando…' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </PageContainer>
  );
}
