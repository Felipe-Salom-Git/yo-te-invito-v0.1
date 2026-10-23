'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { adminGastroKeys } from '@/lib/query/keys';
import { PageContainer, SectionTitle, Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { AdminGastroDiscountStatusBadge } from '@/components/admin/gastro/AdminGastroDiscountStatusBadge';
import { AdminGastroDiscountPublicationEditor } from '@/components/admin/gastro/AdminGastroDiscountPublicationEditor';
import { AdminGastroDiscountQrPanel } from '@/components/admin/gastro/AdminGastroDiscountQrPanel';
import { AdminGastroDiscountVisualPreview } from '@/components/admin/gastro/AdminGastroDiscountVisualPreview';
import { AdminGastroPendingEditPanel } from '@/components/admin/gastro/AdminGastroPendingEditPanel';
import { AdminGastroCourtesyReviewPanel } from '@/components/admin/gastro/AdminGastroCourtesyReviewPanel';
import { GastroDiscountDetailContent } from '@/components/gastro/GastroDiscountDetailContent';
import { GastroDiscountOperationalMetricsPanel } from '@/components/gastro/GastroDiscountOperationalMetricsPanel';
import { AdminGastroDiscountCommercialContextPanel } from '@/components/admin/gastro/AdminGastroDiscountCommercialContextPanel';
import { AdminGastroDiscountEconomicMetricsPanel } from '@/components/admin/gastro/AdminGastroDiscountEconomicMetricsPanel';
import { useAdminBenefitAgreementPartnerHistory } from '@/lib/query/benefit-agreements';
import { buildDiscountSettlementHref } from '@/lib/admin/settlement-generate-context';
import {
  canArchiveGastroDiscount,
  canUnarchiveGastroDiscount,
  resolveCourtesyActions,
} from '@yo-te-invito/shared';

export default function AdminGastroDiscountDetailPage() {
  const params = useParams();
  const profileId = (params?.profileId as string) ?? '';
  const discountId = (params?.discountId as string) ?? '';
  const router = useRouter();
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [rejectReason, setRejectReason] = useState('');
  const [note, setNote] = useState('');

  const { data: item, isLoading, isError } = useQuery({
    queryKey: adminGastroKeys.discount(profileId, discountId),
    queryFn: () => repos.adminGastro.getDiscount(profileId, discountId),
    enabled: !!profileId && !!discountId,
  });

  const summaryQuery = useQuery({
    queryKey: adminGastroKeys.discountSummary(profileId, discountId),
    queryFn: () => repos.adminGastro.getDiscountSummary(profileId, discountId),
    enabled: !!profileId && !!discountId,
  });

  const operationalMetricsQuery = useQuery({
    queryKey: adminGastroKeys.operationalMetrics(profileId, discountId),
    queryFn: () => repos.adminGastro.getDiscountOperationalMetrics(profileId, discountId),
    enabled: !!profileId && !!discountId,
  });

  const agreementHistoryQuery = useAdminBenefitAgreementPartnerHistory(
    profileId
      ? { vertical: 'GASTRO', gastroProfileId: profileId }
      : null,
  );
  const hasCurrentAgreement = Boolean(agreementHistoryQuery.data?.current);

  const statusMutation = useMutation({
    mutationFn: (status: 'ACTIVE' | 'CANCELLED') =>
      repos.adminGastro.updateDiscountStatus(profileId, discountId, { status }),
    onError: (e) => addToast(getErrorMessage(e), 'error'),
    onSuccess: (_, status) => {
      addToast(status === 'ACTIVE' ? 'Descuento activado' : 'Descuento desactivado', 'success');
      invalidate();
      queryClient.invalidateQueries({
        queryKey: adminGastroKeys.discountSummary(profileId, discountId),
      });
    },
  });

  useEffect(() => {
    if (item?.profileId && item.profileId !== profileId) {
      router.replace(`/admin/gastronomicos/${item.profileId}/descuentos/${discountId}`);
    }
  }, [item?.profileId, profileId, discountId, router]);

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: adminGastroKeys.discount(profileId, discountId),
    });
    queryClient.invalidateQueries({ queryKey: adminGastroKeys.discounts(profileId) });
    queryClient.invalidateQueries({ queryKey: adminGastroKeys.detail(profileId) });
    queryClient.invalidateQueries({ queryKey: adminGastroKeys.all });
  };

  const markNegotiation = useMutation({
    mutationFn: () =>
      repos.adminGastro.markCommissionNegotiation(profileId, discountId, note || null),
    onError: (e) => addToast(getErrorMessage(e), 'error'),
    onSuccess: () => {
      addToast('Marcado en coordinación de comisión', 'success');
      invalidate();
    },
  });

  const approve = useMutation({
    mutationFn: () => repos.adminGastro.approve(profileId, discountId),
    onError: (e) => addToast(getErrorMessage(e), 'error'),
    onSuccess: (updated) => {
      const delivery = updated.courtesyDelivery;
      if (!delivery) {
        addToast('Ticket aprobado', 'success');
      } else if (delivery.failed > 0 || !delivery.emailConfigured) {
        addToast(
          `Cortesía aprobada. ${delivery.sent} entregada(s), ${delivery.failed} con error: podés reintentar la entrega.`,
          'error',
        );
      } else {
        addToast(`Cortesía aprobada y entregada a ${delivery.sent} destinatario(s)`, 'success');
      }
      invalidate();
    },
  });

  const redeliver = useMutation({
    mutationFn: () => repos.adminGastro.redeliverCourtesy(profileId, discountId),
    onError: (e) => addToast(getErrorMessage(e), 'error'),
    onSuccess: (updated) => {
      const delivery = updated.courtesyDelivery;
      if (delivery && delivery.failed > 0) {
        addToast(`${delivery.sent} entregada(s), ${delivery.failed} siguen con error`, 'error');
      } else {
        addToast(`Entrega reintentada: ${delivery?.sent ?? 0} enviada(s)`, 'success');
      }
      invalidate();
    },
  });

  const reject = useMutation({
    mutationFn: () =>
      repos.adminGastro.reject(profileId, discountId, rejectReason, note || null),
    onError: (e) => addToast(getErrorMessage(e), 'error'),
    onSuccess: () => {
      addToast(
        item?.visibility === 'COURTESY_ONLY'
          ? 'Cortesía rechazada: cupones cancelados y local notificado'
          : 'Ticket rechazado',
        'success',
      );
      invalidate();
    },
  });

  const cancel = useMutation({
    mutationFn: () =>
      repos.adminGastro.cancel(profileId, discountId, rejectReason, note || null),
    onError: (e) => addToast(getErrorMessage(e), 'error'),
    onSuccess: () => {
      addToast(item?.visibility === 'COURTESY_ONLY' ? 'Cortesía cancelada' : 'Ticket cancelado', 'success');
      invalidate();
    },
  });

  const sendQr = useMutation({
    mutationFn: () => repos.adminGastro.sendQrEmail(profileId, discountId),
    onError: (e) => addToast(getErrorMessage(e), 'error'),
    onSuccess: (updated) => {
      if (updated.emailSendError) {
        addToast(updated.emailSendError, 'error');
      } else {
        addToast('QR enviado por email', 'success');
      }
      invalidate();
    },
  });

  const approveEdit = useMutation({
    mutationFn: () => repos.adminGastro.approvePendingEdit(profileId, discountId),
    onError: (e) => addToast(getErrorMessage(e), 'error'),
    onSuccess: () => {
      addToast('Edición aprobada. La versión publicada se actualizó.', 'success');
      invalidate();
    },
  });

  const rejectEdit = useMutation({
    mutationFn: () => repos.adminGastro.rejectPendingEdit(profileId, discountId, note || null),
    onError: (e) => addToast(getErrorMessage(e), 'error'),
    onSuccess: () => {
      addToast('Edición rechazada. Se conserva la versión publicada.', 'success');
      invalidate();
    },
  });

  const archive = useMutation({
    mutationFn: (archived: boolean) =>
      repos.adminGastro.archiveDiscount(profileId, discountId, archived),
    onError: (e) => addToast(getErrorMessage(e), 'error'),
    onSuccess: (_, archived) => {
      addToast(archived ? 'Descuento archivado' : 'Descuento restaurado', 'success');
      invalidate();
    },
  });

  if (isLoading) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }

  if (isError || !item) {
    return (
      <PageContainer>
        <p className="text-text-muted">Ticket no encontrado</p>
        <Link
          href={`/admin/gastronomicos/${profileId}`}
          className="mt-4 inline-block text-sm text-accent hover:underline"
        >
          ← Volver al local
        </Link>
      </PageContainer>
    );
  }

  const canonicalProfileId = item.profileId;
  const isCourtesy = item.visibility === 'COURTESY_ONLY';
  const pendingDeliveryCount =
    item.courtesy?.metrics?.pendingDeliveryClaims ?? item.courtesy?.pendingDeliveryCount ?? 0;
  // G8.10.3: courtesy actions follow its lifecycle (approve/reject only while pending, etc.).
  const courtesyActions = isCourtesy
    ? resolveCourtesyActions({
        actor: 'ADMIN',
        status: item.status,
        archivedAt: item.archivedAt,
        validTo: item.courtesy?.validTo ?? item.validTo,
        createdByOrigin: item.createdByOrigin,
        pendingDeliveryClaims: pendingDeliveryCount,
      })
    : null;
  const subject = isCourtesy ? 'cortesía' : 'ticket';
  const moderationPending =
    markNegotiation.isPending ||
    approve.isPending ||
    redeliver.isPending ||
    reject.isPending ||
    cancel.isPending ||
    sendQr.isPending ||
    approveEdit.isPending ||
    rejectEdit.isPending ||
    archive.isPending;

  return (
    <PageContainer>
      <Link
        href={`/admin/gastronomicos/${canonicalProfileId}`}
        className="mb-4 inline-block text-sm text-text-muted hover:text-text"
      >
        ← Volver al local
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionTitle>
          {item.title ?? (isCourtesy ? 'Cortesía' : 'Ticket de descuento')}
        </SectionTitle>
        <AdminGastroDiscountStatusBadge status={item.status} />
      </div>

      <p className="mt-2 text-sm text-text-muted">
        Contacto: {item.ownerEmail ?? '—'} · {item.ownerPhone ?? '—'}
        {item.createdByOrigin === 'ADMIN' ? ' · Creado por Admin' : ' · Creado por Gastro'}
        {item.hasPendingUpdate
          ? ' · Edición pendiente'
          : item.status === 'PENDING_REVIEW' || item.status === 'COMMISSION_NEGOTIATION'
            ? isCourtesy
              ? ' · Cortesía pendiente de aprobación'
              : ' · Nuevo descuento pendiente'
            : ''}
      </p>

      {isCourtesy && (
        <>
          <AdminGastroCourtesyReviewPanel
            item={item}
            hasCurrentAgreement={hasCurrentAgreement}
            agreementLoading={agreementHistoryQuery.isLoading}
          />
          {/* G8.10.4: the existing G5 agreement panel, next to the review (same endpoint). */}
          <AdminGastroDiscountCommercialContextPanel profileId={canonicalProfileId} />
        </>
      )}

      {item.hasPendingUpdate && item.pendingUpdate && (
        <AdminGastroPendingEditPanel
          discount={item}
          note={note}
          pending={moderationPending}
          onApprove={() => {
            if (window.confirm('¿Aplicar la edición propuesta a la versión publicada?')) {
              approveEdit.mutate();
            }
          }}
          onReject={() => {
            if (window.confirm('¿Descartar la edición y conservar lo publicado?')) {
              rejectEdit.mutate();
            }
          }}
        />
      )}
      {item.discountDate && (
        <p className="text-sm text-text-muted">
          Fecha del descuento: {new Date(item.discountDate).toLocaleDateString('es-AR')}
        </p>
      )}

      {!isCourtesy && (item.summary || item.detail || item.submittedImageUrls.length > 0) && (
        <section className="mt-6 rounded-lg border border-border bg-bg-muted/50 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
            Contenido enviado por el local
          </h3>
          {item.summary && (
            <p className="mt-2 text-sm text-text">
              <span className="font-medium">Resumen: </span>
              {item.summary}
            </p>
          )}
          {item.detail && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-text-muted">{item.detail}</p>
          )}
          {item.submittedImageUrls.length > 0 && (
            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {item.submittedImageUrls.map((url, index) => (
                <li key={`submitted-preview-${index}`} className="aspect-square overflow-hidden rounded border border-border">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {item.emailSentAt && (
        <p className="mt-2 text-sm text-accent-soft">
          Email enviado: {new Date(item.emailSentAt).toLocaleString('es-AR')}
        </p>
      )}

      {/* Courtesies have no master QR: each recipient owns an individual claim QR. */}
      {!isCourtesy && (
        <>
          <AdminGastroDiscountQrPanel qrPayload={item.qrPayload} status={item.status} />
          <AdminGastroDiscountVisualPreview
            profileId={profileId}
            discountId={discountId}
            qrPayload={item.qrPayload ?? null}
            gastroName={null}
            discountTitle={item.title}
            discountType={item.type}
            discountValue={item.value}
          />
        </>
      )}

      {summaryQuery.data ? (
        <div className="mt-8">
          <GastroDiscountDetailContent
            summary={summaryQuery.data}
            actor="ADMIN"
            archivedAt={item.archivedAt ?? null}
            rejectionReason={item.rejectionReason}
            statusLoading={statusMutation.isPending}
            onActivate={() => statusMutation.mutate('ACTIVE')}
            onDeactivate={() => statusMutation.mutate('CANCELLED')}
          />
        </div>
      ) : summaryQuery.isLoading ? (
        <p className="mt-8 text-sm text-text-muted">Cargando métricas de cupones…</p>
      ) : null}

      {operationalMetricsQuery.isLoading ? (
        <p className="mt-8 text-sm text-text-muted">Cargando métricas operativas…</p>
      ) : operationalMetricsQuery.data ? (
        <GastroDiscountOperationalMetricsPanel
          metrics={operationalMetricsQuery.data}
          isCourtesy={isCourtesy}
        />
      ) : null}

      {!isCourtesy && <AdminGastroDiscountCommercialContextPanel profileId={canonicalProfileId} />}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Link
          href={buildDiscountSettlementHref({
            gastroProfileId: canonicalProfileId,
            discountId,
          })}
          className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-accent-hover"
        >
          Liquidar
        </Link>
        <p className="text-xs text-text-muted">
          Liquidación del local por período (incluye usos de todos sus descuentos).
        </p>
      </div>

      <AdminGastroDiscountEconomicMetricsPanel
        profileId={canonicalProfileId}
        discountId={discountId}
      />

      {!isCourtesy && (
        <div className="mt-8">
          <AdminGastroDiscountPublicationEditor
            profileId={canonicalProfileId}
            discount={item}
            onSaved={invalidate}
          />
        </div>
      )}

      {courtesyActions?.redeliver && (
        <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-sm text-text">
            {pendingDeliveryCount} destinatario(s) todavía no recibieron su email. El reintento
            solo envía a quienes no tienen envío registrado.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-2"
            disabled={moderationPending}
            onClick={() => {
              if (
                window.confirm(
                  `¿Reintentar la entrega a ${pendingDeliveryCount} destinatario(s) sin email enviado?`,
                )
              ) {
                redeliver.mutate();
              }
            }}
          >
            Reintentar entrega
          </Button>
        </div>
      )}

      {!['REJECTED', 'CANCELLED', 'EXPIRED'].includes(item.status) && (
        <>
          <div className="mt-8 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            {isCourtesy
              ? 'La cortesía requiere acuerdo comercial vigente del local. Al aprobar se entrega por email a los destinatarios ya definidos.'
              : 'Coordiná la comisión con el local antes de aprobar. Guardá la publicación con al menos una imagen.'}
          </div>
          <Input
            label="Nota interna"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-4"
          />
          <Input
            label="Motivo (rechazo/cancelación)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="mt-2"
          />
          <div className="mt-6 flex flex-wrap gap-2">
            {(courtesyActions ? courtesyActions.markNegotiation : item.status === 'PENDING_REVIEW') && (
              <Button
                type="button"
                variant="secondary"
                disabled={moderationPending}
                onClick={() => {
                  if (window.confirm('¿Marcar en coordinación de comisión?')) markNegotiation.mutate();
                }}
              >
                Marcar en coordinación
              </Button>
            )}
            {(courtesyActions
              ? courtesyActions.approve
              : ['PENDING_REVIEW', 'COMMISSION_NEGOTIATION'].includes(item.status)) && (
              <div className="flex flex-col gap-1">
                <Button
                  type="button"
                  disabled={
                    moderationPending ||
                    agreementHistoryQuery.isLoading ||
                    !hasCurrentAgreement
                  }
                  onClick={() => {
                    if (!hasCurrentAgreement) {
                      addToast(
                        'Creá el acuerdo comercial del local antes de aprobar',
                        'error',
                      );
                      return;
                    }
                    if (
                      window.confirm(
                        isCourtesy
                          ? `¿Aprobar la cortesía y entregarla a ${item.courtesy?.recipientCount ?? 0} destinatario(s)?`
                          : '¿Aprobar este ticket?',
                      )
                    ) {
                      approve.mutate();
                    }
                  }}
                >
                  Aprobar
                </Button>
                {!agreementHistoryQuery.isLoading && !hasCurrentAgreement ? (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Aprobación bloqueada: falta acuerdo comercial vigente del local.
                  </p>
                ) : null}
              </div>
            )}
            {(!courtesyActions || courtesyActions.reject) && (
              <Button
                type="button"
                variant="secondary"
                disabled={moderationPending || !rejectReason.trim()}
                onClick={() => {
                  if (
                    window.confirm(
                      isCourtesy
                        ? '¿Rechazar esta cortesía? Los cupones retenidos se cancelan, nadie recibe nada y se notifica al local.'
                        : '¿Rechazar este ticket?',
                    )
                  ) {
                    reject.mutate();
                  }
                }}
              >
                Rechazar
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              disabled={moderationPending || !rejectReason.trim()}
              onClick={() => {
                if (
                  window.confirm(
                    isCourtesy
                      ? '¿Cancelar esta cortesía? Los QR no usados dejan de ser válidos y no se puede reactivar.'
                      : '¿Cancelar este ticket?',
                  )
                ) {
                  cancel.mutate();
                }
              }}
            >
              Cancelar {subject}
            </Button>
            {!isCourtesy && ['APPROVED', 'ACTIVE'].includes(item.status) && (
              <Button
                type="button"
                disabled={moderationPending}
                onClick={() => {
                  if (window.confirm('¿Enviar QR por email al local?')) sendQr.mutate();
                }}
              >
                Enviar QR por mail
              </Button>
            )}
          </div>
        </>
      )}

      {(canUnarchiveGastroDiscount({
        status: item.status,
        archivedAt: item.archivedAt,
      }) ||
        canArchiveGastroDiscount({
          status: item.status,
          archivedAt: item.archivedAt,
          validityMode: item.validityMode,
          validTo: item.validTo,
          discountDate: item.discountDate,
        })) && (
        <div className="mt-6">
          {item.archivedAt ? (
            <Button
              type="button"
              variant="secondary"
              disabled={moderationPending}
              onClick={() => archive.mutate(false)}
            >
              Restaurar del archivo
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              disabled={moderationPending}
              onClick={() => {
                if (window.confirm('¿Archivar? Se conserva el histórico de claims y métricas.')) {
                  archive.mutate(true);
                }
              }}
            >
              Archivar
            </Button>
          )}
        </div>
      )}
    </PageContainer>
  );
}
