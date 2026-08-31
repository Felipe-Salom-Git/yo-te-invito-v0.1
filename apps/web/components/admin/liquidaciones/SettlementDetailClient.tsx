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
import { BENEFIT_VERTICAL_LABEL } from '@/lib/admin/benefit-agreement-labels';
import {
  useAdminBenefitSettlement,
  useAdminBenefitSettlementTransfers,
  useAllocateAdminBenefitSettlement,
  useCloseAdminBenefitSettlement,
  useRefreshAdminBenefitSettlement,
  useRegisterAdminBenefitSettlementTransfer,
  useReverseAdminBenefitSettlementTransfer,
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

function pesosInputToCentsString(pesos: string): string {
  const digits = pesos.replace(/\D/g, '');
  if (!digits) return '0';
  return (BigInt(digits) * BigInt(100)).toString();
}

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
  const { data: transfersData } = useAdminBenefitSettlementTransfers(id);
  const refreshMutation = useRefreshAdminBenefitSettlement();
  const allocateMutation = useAllocateAdminBenefitSettlement();
  const closeMutation = useCloseAdminBenefitSettlement();
  const registerTransferMutation = useRegisterAdminBenefitSettlementTransfer();
  const reverseTransferMutation = useReverseAdminBenefitSettlementTransfer();

  const [cashCount, setCashCount] = useState('1');
  const [barterCount, setBarterCount] = useState('1');
  const [transferPesos, setTransferPesos] = useState('');
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [transferReference, setTransferReference] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
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
  const transfers = transfersData?.data ?? [];
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

  const handleRegisterTransfer = async () => {
    setActionError(null);
    const amountCents = pesosInputToCentsString(transferPesos);
    if (amountCents === '0') {
      setActionError('Ingresá un monto válido.');
      return;
    }
    const outstanding = BigInt(summary.cashOutstandingCents);
    if (BigInt(amountCents) > outstanding) {
      const proceed = window.confirm(
        `El importe supera el saldo pendiente de transferencia (${formatBenefitMoneyCents(summary.cashOutstandingCents)}).\n\nEl backend validará el registro. ¿Continuar?`,
      );
      if (!proceed) return;
    }
    try {
      await registerTransferMutation.mutateAsync({
        id,
        body: {
          amountCents,
          currency: 'ARS',
          transferredAt: new Date(`${transferDate}T12:00:00.000Z`).toISOString(),
          ...(transferReference.trim() ? { reference: transferReference.trim() } : {}),
          ...(transferNotes.trim() ? { notes: transferNotes.trim() } : {}),
        },
      });
      setTransferPesos('');
      setTransferReference('');
      setTransferNotes('');
    } catch (err) {
      setActionError(mapBenefitSettlementErrorMessage(err));
    }
  };

  const handleReverseTransfer = async (transferId: string) => {
    setActionError(null);
    const reason = window.prompt('Motivo de reversión (obligatorio):');
    if (!reason?.trim()) return;
    const ok = window.confirm(
      'La transferencia no se eliminará; quedará registrada como revertida.\n\n¿Confirmar?',
    );
    if (!ok) return;
    try {
      await reverseTransferMutation.mutateAsync({
        id,
        transferId,
        body: { reason: reason.trim() },
      });
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

      <section className="mt-8">
        <h3 className="font-medium text-text">Resumen</h3>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-text-muted">Partner</dt>
            <dd>{settlement.partnerDisplayName ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Período</dt>
            <dd>{formatBenefitSettlementPeriodLabel(settlement.periodKey)}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Base económico generado</dt>
            <dd>{formatBenefitMoneyCents(summary.eligibleBaseAmountCents)}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Acuerdo comercial</dt>
            <dd>
              <Link href={agreementHref} className="text-accent hover:underline">
                Ver acuerdo comercial
              </Link>
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-8">
        <h3 className="font-medium text-text">Usos</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Elegibles" value={String(summary.eligibleUsageCount)} />
          <SummaryCard label="CASH" value={String(summary.allocatedCashCount)} />
          <SummaryCard label="BARTER" value={String(summary.allocatedBarterCount)} />
          <SummaryCard
            label="Pendientes de definir"
            value={`${summary.pendingUsageCount} usos`}
          />
        </div>
        {summary.pendingUsageCount === 0 && summary.eligibleUsageCount > 0 ? null : summary.pendingUsageCount === 0 ? (
          <EmptyState
            className="mt-4"
            title="No hay usos pendientes de asignar"
            description="Todos los usos elegibles ya tienen asignación económica."
          />
        ) : null}
      </section>

      {!isClosed && summary.pendingUsageCount > 0 ? (
        <section className="mt-8 rounded-lg border border-border p-4">
          <h3 className="font-medium text-text">Asignar usos</h3>
          <p className="mt-1 text-sm text-text-muted">
            Pendientes de definir: {summary.pendingUsageCount} usos. El backend asigna del más
            antiguo al más reciente.
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
        <h3 className="font-medium text-text">CASH — transferencias</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <SummaryCard
            label="Cash asignado (base)"
            value={formatBenefitMoneyCents(summary.cashBaseAmountCents)}
          />
          <SummaryCard
            label="Cash recibido"
            value={formatBenefitMoneyCents(summary.cashReceivedCents)}
          />
          <SummaryCard
            label="Cash pendiente"
            value={formatBenefitMoneyCents(summary.cashOutstandingCents)}
          />
        </div>
        <p className="mt-2 text-xs text-text-muted">
          Due: {formatBenefitMoneyCents(summary.cashDueCents)} · Cobranza:{' '}
          {BENEFIT_CASH_COLLECTION_STATUS_LABEL[summary.cashCollectionStatus]}
        </p>
      </section>

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

      <section className="mt-8">
        <h3 className="font-medium text-text">Transferencias</h3>
        {transfers.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">Sin transferencias registradas.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted">
                  <th className="px-2 py-2">Fecha</th>
                  <th className="px-2 py-2">Monto</th>
                  <th className="px-2 py-2">Referencia</th>
                  <th className="px-2 py-2">Estado</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {transfers.map((t) => (
                  <tr key={t.id} className="border-b border-border/60">
                    <td className="px-2 py-2">
                      {new Date(t.transferredAt).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-2 py-2">
                      {formatBenefitMoneyCents(t.amountCents)}
                    </td>
                    <td className="px-2 py-2">{t.reference ?? '—'}</td>
                    <td className="px-2 py-2">
                      {t.isActive ? (
                        <Badge>Registrada</Badge>
                      ) : (
                        <Badge>Revertida</Badge>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {t.isActive ? (
                        <button
                          type="button"
                          className="text-sm text-accent hover:underline disabled:opacity-50"
                          disabled={reverseTransferMutation.isPending}
                          onClick={() => handleReverseTransfer(t.id)}
                        >
                          Revertir transferencia
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {summary.cashDueCents !== '0' && !isClosed ? (
          <div className="mt-4 rounded-lg border border-border p-4">
            <h4 className="font-medium text-text">Registrar transferencia</h4>
            <p className="mt-1 text-sm text-text-muted">
              Pendiente actual: {formatBenefitMoneyCents(summary.cashOutstandingCents)}
            </p>
            <div className="mt-3 grid max-w-md gap-3">
              <label className="text-sm">
                Monto (ARS, sin centavos)
                <input
                  className="mt-1 w-full rounded border border-border bg-bg px-2 py-1"
                  value={transferPesos}
                  onChange={(e) => setTransferPesos(e.target.value)}
                />
              </label>
              <label className="text-sm">
                Fecha
                <input
                  type="date"
                  className="mt-1 w-full rounded border border-border bg-bg px-2 py-1"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                />
              </label>
              <label className="text-sm">
                Referencia (opcional)
                <input
                  className="mt-1 w-full rounded border border-border bg-bg px-2 py-1"
                  value={transferReference}
                  onChange={(e) => setTransferReference(e.target.value)}
                />
              </label>
              <label className="text-sm">
                Notas (opcional)
                <textarea
                  className="mt-1 w-full rounded border border-border bg-bg px-2 py-1"
                  rows={2}
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                />
              </label>
              <Button
                disabled={registerTransferMutation.isPending}
                onClick={handleRegisterTransfer}
              >
                {registerTransferMutation.isPending ? 'Registrando…' : 'Registrar transferencia'}
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="mt-8">
        <h3 className="font-medium text-text">Ledger de crédito</h3>
        <p className="mt-2 text-sm text-text-muted">
          Movimientos de canje del partner — separados del cash de transferencia.
        </p>
        <Link href={ledgerHref} className="mt-2 inline-block text-accent hover:underline">
          Ver créditos del partner →
        </Link>
      </section>
    </PageContainer>
  );
}
