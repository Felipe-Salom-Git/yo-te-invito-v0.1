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
import { BENEFIT_VERTICAL_LABEL } from '@/lib/admin/benefit-agreement-labels';
import {
  useAdminBenefitSettlement,
  useAdminBenefitSettlementAudit,
  useAllocateAdminBenefitSettlement,
  useCloseAdminBenefitSettlement,
  useRefreshAdminBenefitSettlement,
} from '@/lib/query/benefit-settlements';
import { useAdminCourtesyCreditBalance } from '@/lib/query/courtesy-credit-ledger';
import {
  BENEFIT_CASH_COLLECTION_STATUS_LABEL,
  BENEFIT_SETTLEMENT_STATUS_LABEL,
  estimatePendingAllocationBaseCents,
  formatBenefitMoneyCents,
  formatBenefitSettlementPeriodLabel,
  formatSignedBenefitMoneyCents,
  mapBenefitSettlementErrorMessage,
} from '@yo-te-invito/shared';

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-muted p-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-text">{value}</p>
    </div>
  );
}

export function SettlementDetailClient({ id }: { id: string }) {
  const { data: settlement, isLoading, isError } = useAdminBenefitSettlement(id);
  const auditQuery = useAdminBenefitSettlementAudit(id);
  const refreshMutation = useRefreshAdminBenefitSettlement();
  const allocateMutation = useAllocateAdminBenefitSettlement();
  const closeMutation = useCloseAdminBenefitSettlement();

  const [cashCount, setCashCount] = useState('1');
  const [barterCount, setBarterCount] = useState('1');
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);

  const partnerQuery =
    settlement?.vertical && settlement.gastroProfileId
      ? {
          vertical: settlement.vertical as 'GASTRO' | 'ACTIVITY',
          gastroProfileId: settlement.gastroProfileId,
          currency: 'ARS' as const,
        }
      : settlement?.vertical && settlement.excursionOperatorId
        ? {
            vertical: settlement.vertical as 'GASTRO' | 'ACTIVITY',
            excursionOperatorId: settlement.excursionOperatorId,
            currency: 'ARS' as const,
          }
        : null;

  const { data: ledgerBalance } = useAdminCourtesyCreditBalance(partnerQuery);

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
  const expectedCredit = summary.barterCreditExpectedCents;
  const materializedCredit = summary.barterCreditMaterializedCents;
  const creditDrift =
    expectedCredit != null &&
    materializedCredit != null &&
    expectedCredit !== materializedCredit;

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
    if (summary.pendingUsageCount > 0) {
      setActionError('Hay usos pendientes de definir. Asignalos antes de cerrar.');
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
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>{BENEFIT_VERTICAL_LABEL[settlement.vertical]}</Badge>
            <Badge>{BENEFIT_SETTLEMENT_STATUS_LABEL[settlement.status]}</Badge>
            <Badge>{BENEFIT_CASH_COLLECTION_STATUS_LABEL[summary.cashCollectionStatus]}</Badge>
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
          {!isClosed && summary.pendingUsageCount === 0 ? (
            <Button disabled={closeMutation.isPending} onClick={handleClose}>
              {closeMutation.isPending ? 'Cerrando…' : 'Cerrar liquidación'}
            </Button>
          ) : null}
        </div>
      </div>

      {isClosed ? (
        <p className="mt-4 text-sm text-text-muted">
          Liquidación cerrada — no se agregan usos automáticamente.
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
        <SettlementPendingValidationsSection settlementId={id} />
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

      <section className="mt-8">
        <h3 className="font-medium text-text">Canje — crédito de cortesías</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Base en canje"
            value={formatBenefitMoneyCents(summary.barterBaseAmountCents)}
          />
          <SummaryCard
            label="Crédito generado"
            value={formatBenefitMoneyCents(
              materializedCredit ?? expectedCredit ?? '0',
            )}
          />
          <SummaryCard
            label="Crédito consumido"
            value={formatSignedBenefitMoneyCents(
              ledgerBalance?.creditConsumedCents ?? '0',
            )}
          />
          <SummaryCard
            label="Saldo disponible"
            value={formatSignedBenefitMoneyCents(
              ledgerBalance?.balanceAvailableCents ?? '0',
            )}
          />
        </div>
        {creditDrift ? (
          <p className="mt-3 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
            Hay una diferencia de materialización de crédito. Revisar conciliación.
          </p>
        ) : null}
        {settlement.vertical === 'GASTRO' && settlement.gastroProfileId ? (
          <Link
            href={`/admin/gastronomicos/${settlement.gastroProfileId}/cortesia`}
            className="mt-3 inline-block text-sm text-accent hover:underline"
          >
            Crear cortesía con saldo →
          </Link>
        ) : settlement.vertical === 'ACTIVITY' ? (
          <p className="mt-3 text-sm text-text-muted">
            Saldo de canje disponible:{' '}
            {formatSignedBenefitMoneyCents(ledgerBalance?.balanceAvailableCents ?? '0')}. Consumo
            de cortesías Activity: no disponible en V3.3.
          </p>
        ) : null}
      </section>

      <SettlementCashTransfersSection settlementId={id} summary={summary} />

      <section className="mt-8">
        <h3 className="font-medium text-text">Ledger de crédito</h3>
        <p className="mt-2 text-sm text-text-muted">
          Movimientos de canje del partner — separados del cash de transferencia.
        </p>
        <Link href={ledgerHref} className="mt-2 inline-block text-accent hover:underline">
          Ver créditos del partner →
        </Link>
      </section>

      <SettlementAuditPanel settlementId={id} />
    </PageContainer>
  );
}
