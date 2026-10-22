'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Badge,
  Button,
  EmptyState,
  PageContainer,
  SectionTitle,
} from '@/components';
import { LiquidacionesSubnav } from '@/components/admin/liquidaciones/LiquidacionesSubnav';
import { SettlementAuditPanel } from '@/components/admin/liquidaciones/SettlementAuditPanel';
import { SettlementOverviewSection } from '@/components/admin/liquidaciones/SettlementOverviewSection';
import { SettlementPendingValidationsSection } from '@/components/admin/liquidaciones/SettlementPendingValidationsSection';
import { SettlementCashTransfersSection } from '@/components/admin/liquidaciones/SettlementCashTransfersSection';
import { SettlementBarterSection } from '@/components/admin/liquidaciones/SettlementBarterSection';
import { BENEFIT_VERTICAL_LABEL } from '@/lib/admin/benefit-agreement-labels';
import {
  useAdminBenefitSettlement,
  useAdminBenefitSettlementAudit,
  useAdminBenefitSettlementPendingValidations,
  useAllocateAdminBenefitSettlement,
  useCloseAdminBenefitSettlement,
  useRefreshAdminBenefitSettlement,
} from '@/lib/query/benefit-settlements';
import {
  BENEFIT_CASH_COLLECTION_STATUS_LABEL,
  BENEFIT_SETTLEMENT_STATUS_LABEL,
  estimatePendingAllocationBaseCents,
  formatBenefitMoneyCents,
  deriveSettlementDisplayStatus,
  formatBenefitSettlementPeriodLabel,
  mapBenefitSettlementErrorMessage,
  resolveSettlementCloseBlocker,
  type SettlementCloseBlocker,
  type SettlementDisplayStatus,
} from '@yo-te-invito/shared';

const DISPLAY_TONE_CLASS: Record<SettlementDisplayStatus['tone'], string> = {
  neutral: 'bg-bg-muted text-text-muted',
  warning: 'bg-amber-500/15 text-amber-300',
  success: 'bg-emerald-500/15 text-emerald-300',
};

const CLOSE_BLOCKER_MESSAGE: Record<SettlementCloseBlocker, string> = {
  ALREADY_CLOSED: 'la liquidación ya está cerrada.',
  PENDING_USAGES: 'hay usos pendientes de asignar a CASH o BARTER.',
  MISSING_AGREEMENTS: 'hay validaciones sin acuerdo comercial aplicable.',
};

export function SettlementDetailClient({
  id,
  fromDiscountId = null,
}: {
  id: string;
  /** «Liquidar» from a discount: focuses its usages; settlement stays partner + period. */
  fromDiscountId?: string | null;
}) {
  const { data: settlement, isLoading, isError } = useAdminBenefitSettlement(id);
  const auditQuery = useAdminBenefitSettlementAudit(id);
  const pendingQuery = useAdminBenefitSettlementPendingValidations(
    id,
    settlement != null && settlement.status !== 'CLOSED',
  );
  const refreshMutation = useRefreshAdminBenefitSettlement();
  const allocateMutation = useAllocateAdminBenefitSettlement();
  const closeMutation = useCloseAdminBenefitSettlement();

  const [cashCount, setCashCount] = useState('1');
  const [barterCount, setBarterCount] = useState('1');
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);

  if (isLoading) {
    return (
      <PageContainer>
        <LiquidacionesSubnav />
        <p className="text-text-muted">Cargando liquidación…</p>
      </PageContainer>
    );
  }

  if (isError || !settlement) {
    return (
      <PageContainer>
        <LiquidacionesSubnav />
        <p className="text-sm text-red-500">No se pudo cargar la liquidación.</p>
      </PageContainer>
    );
  }

  const { summary } = settlement;
  const isClosed = settlement.status === 'CLOSED';
  const displayStatus = deriveSettlementDisplayStatus({ status: settlement.status, ...summary });
  const closeBlocker = resolveSettlementCloseBlocker({
    status: settlement.status,
    pendingUsageCount: summary.pendingUsageCount,
    missingAgreementCount: pendingQuery.data?.missingAgreementCount ?? 0,
  });

  const agreementHref = `/admin/liquidaciones/acuerdos?vertical=${settlement.vertical}${
    settlement.gastroProfileId
      ? `&partnerId=${settlement.gastroProfileId}`
      : settlement.excursionOperatorId
        ? `&partnerId=${settlement.excursionOperatorId}`
        : ''
  }`;

  const ledgerHref = `/admin/liquidaciones/creditos?vertical=${settlement.vertical}${
    settlement.gastroProfileId
      ? `&partnerId=${settlement.gastroProfileId}`
      : settlement.excursionOperatorId
        ? `&partnerId=${settlement.excursionOperatorId}`
        : ''
  }`;

  const handleRefresh = async () => {
    setActionError(null);
    setRefreshNote(null);
    const before = summary.eligibleUsageCount;
    try {
      const updated = await refreshMutation.mutateAsync(id);
      const after = updated.summary.eligibleUsageCount;
      if (after > before) {
        setRefreshNote(`Se agregaron ${after - before} usos nuevos.`);
      } else {
        setRefreshNote('Liquidación actualizada — sin usos nuevos.');
      }
    } catch (err) {
      setActionError(mapBenefitSettlementErrorMessage(err));
    }
  };

  const confirmAllocate = async (mode: 'CASH' | 'BARTER') => {
    setActionError(null);
    const count = Number(mode === 'CASH' ? cashCount : barterCount);
    if (!Number.isFinite(count) || count < 1) {
      setActionError('Ingresá una cantidad válida.');
      return;
    }
    if (count > summary.pendingUsageCount) {
      setActionError('No hay suficientes usos pendientes de asignar.');
      return;
    }

    const baseEstimate = estimatePendingAllocationBaseCents(
      summary.pendingBaseAmountCents,
      summary.pendingUsageCount,
      count,
    );

    const message =
      mode === 'CASH'
        ? `Se asignarán ${count} usos a transferencia.\nUsos disponibles: ${summary.pendingUsageCount}\nValor base estimado: ${formatBenefitMoneyCents(baseEstimate)}.\n\nEl valor final lo confirma el backend.`
        : `Se asignarán ${count} usos a canje.\nUsos disponibles: ${summary.pendingUsageCount}\nBase estimada: ${formatBenefitMoneyCents(baseEstimate)}\n\nEl crédito de canje ≠ dinero recibido. El crédito final lo confirma el backend.`;

    if (!window.confirm(message)) return;

    try {
      await allocateMutation.mutateAsync({ id, body: { mode, count } });
    } catch (err) {
      setActionError(mapBenefitSettlementErrorMessage(err));
    }
  };

  const handleClose = async () => {
    setActionError(null);
    if (closeBlocker) {
      setActionError(CLOSE_BLOCKER_MESSAGE[closeBlocker]);
      return;
    }
    const ok = window.confirm(
      'Cerrar congela los usos y asignaciones.\nNo significa que las transferencias estén totalmente cobradas.\n\n¿Confirmar cierre de liquidación?',
    );
    if (!ok) return;
    try {
      await closeMutation.mutateAsync(id);
    } catch (err) {
      setActionError(mapBenefitSettlementErrorMessage(err));
    }
  };

  return (
    <PageContainer>
      <LiquidacionesSubnav />
      <Link
        href="/admin/liquidaciones"
        className="mb-4 inline-block text-sm text-text-muted hover:text-text"
      >
        ← Liquidaciones
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionTitle>
            {settlement.partnerDisplayName ?? 'Liquidación'} —{' '}
            {formatBenefitSettlementPeriodLabel(settlement.periodKey)}
          </SectionTitle>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge>{BENEFIT_VERTICAL_LABEL[settlement.vertical]}</Badge>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${DISPLAY_TONE_CLASS[displayStatus.tone]}`}
              title="Estado operativo derivado (no persistido)"
            >
              {displayStatus.label}
            </span>
            {displayStatus.flags.map((flag) => (
              <Badge key={flag}>{flag}</Badge>
            ))}
            <span className="text-xs text-text-muted">
              Persistido: {BENEFIT_SETTLEMENT_STATUS_LABEL[settlement.status]} · Cobranza:{' '}
              {BENEFIT_CASH_COLLECTION_STATUS_LABEL[summary.cashCollectionStatus]}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isClosed ? (
            <Button
              variant="secondary"
              disabled={refreshMutation.isPending}
              onClick={handleRefresh}
            >
              {refreshMutation.isPending ? 'Actualizando…' : 'Actualizar usos'}
            </Button>
          ) : null}
          {!isClosed ? (
            <Button
              disabled={closeMutation.isPending || closeBlocker !== null}
              onClick={handleClose}
              title={closeBlocker ? CLOSE_BLOCKER_MESSAGE[closeBlocker] : undefined}
            >
              {closeMutation.isPending ? 'Cerrando…' : 'Cerrar liquidación'}
            </Button>
          ) : null}
        </div>
      </div>
      {!isClosed && closeBlocker ? (
        <p className="mt-2 text-xs text-text-muted">
          Cierre no disponible: {CLOSE_BLOCKER_MESSAGE[closeBlocker]}
        </p>
      ) : null}

      {isClosed ? (
        <p className="mt-4 text-sm text-text-muted">
          Liquidación cerrada — no se agregan usos automáticamente.
        </p>
      ) : null}
      {fromDiscountId && settlement.vertical === 'GASTRO' && settlement.gastroProfileId ? (
        <p className="mt-4 rounded-lg border border-accent/30 bg-accent/5 p-3 text-sm text-text-muted">
          Abierta desde un descuento: sus usos aparecen primero. La liquidación es del local y del
          período e incluye los usos de todos sus descuentos.{' '}
          <Link
            href={`/admin/gastronomicos/${encodeURIComponent(settlement.gastroProfileId)}/descuentos/${encodeURIComponent(fromDiscountId)}`}
            className="text-accent hover:underline"
          >
            Volver al descuento
          </Link>
        </p>
      ) : null}
      {refreshNote ? <p className="mt-2 text-sm text-accent">{refreshNote}</p> : null}
      {actionError ? <p className="mt-2 text-sm text-red-500">{actionError}</p> : null}

      <SettlementOverviewSection
        settlement={settlement}
        audit={auditQuery.data}
        agreementHref={agreementHref}
      />
      {summary.eligibleUsageCount === 0 ? (
        <EmptyState
          className="mt-4"
          title="Sin usos validados en el período"
          description="Cuando haya validaciones del partner en este período, usá «Actualizar usos»."
        />
      ) : null}
      {!isClosed && summary.pendingUsageCount > 0 ? (
        <SettlementPendingValidationsSection settlementId={id} focusBenefitId={fromDiscountId} />
      ) : null}

      {!isClosed && summary.pendingUsageCount > 0 ? (
        <section className="mt-8 rounded-lg border border-border p-4">
          <h3 className="font-medium text-text">Asignación rápida por cantidad</h3>
          <p className="mt-1 text-sm text-text-muted">
            Atajo: asigna los {summary.pendingUsageCount} usos pendientes del más antiguo al más
            reciente. Para elegir usos puntuales, usá la selección de arriba.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm">
                Asignar a CASH (cantidad)
                <input
                  type="number"
                  min={1}
                  max={summary.pendingUsageCount}
                  className="mt-1 w-full rounded border border-border bg-bg px-2 py-1"
                  value={cashCount}
                  onChange={(e) => setCashCount(e.target.value)}
                />
              </label>
              <Button
                className="mt-2"
                variant="secondary"
                disabled={allocateMutation.isPending}
                onClick={() => confirmAllocate('CASH')}
              >
                Asignar a transferencia
              </Button>
            </div>
            <div>
              <label className="text-sm">
                Asignar a BARTER (cantidad)
                <input
                  type="number"
                  min={1}
                  max={summary.pendingUsageCount}
                  className="mt-1 w-full rounded border border-border bg-bg px-2 py-1"
                  value={barterCount}
                  onChange={(e) => setBarterCount(e.target.value)}
                />
              </label>
              <Button
                className="mt-2"
                variant="secondary"
                disabled={allocateMutation.isPending}
                onClick={() => confirmAllocate('BARTER')}
              >
                Asignar a canje
              </Button>
              <p className="mt-2 text-xs text-text-muted">
                Crédito de canje ≠ dinero recibido.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <SettlementCashTransfersSection settlementId={id} summary={summary} />

      <SettlementBarterSection
        settlement={settlement}
        audit={auditQuery.data}
        ledgerHref={ledgerHref}
      />

      <SettlementAuditPanel settlementId={id} />
    </PageContainer>
  );
}
