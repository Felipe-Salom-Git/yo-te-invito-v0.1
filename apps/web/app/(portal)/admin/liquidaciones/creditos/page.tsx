'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
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
  useAdminCourtesyCreditBalance,
  useAdminCourtesyCreditLedgerList,
  useCreateCourtesyCreditAdjustment,
  useReverseCourtesyCreditLedgerEntry,
} from '@/lib/query/courtesy-credit-ledger';
import { useAdminGastroLocationsList } from '@/lib/query/admin-gastro';
import { useRepositories } from '@/repositories/context';
import {
  COURTESY_LEDGER_ENTRY_TYPE_LABEL,
  formatBenefitMoneyCents,
  formatSignedBenefitMoneyCents,
  mapBenefitSettlementErrorMessage,
} from '@yo-te-invito/shared';

const TENANT_ID = 'tenant-demo';

function signedPesosToCentsString(input: string): string {
  const trimmed = input.trim();
  const negative = trimmed.startsWith('-');
  const digits = trimmed.replace(/[^\d]/g, '');
  if (!digits) return '0';
  const cents = (BigInt(digits) * BigInt(100)).toString();
  return negative ? `-${cents}` : cents;
}

export default function AdminCourtesyCreditLedgerPage() {
  const searchParams = useSearchParams();
  const repos = useRepositories();
  const [vertical, setVertical] = useState<'GASTRO' | 'ACTIVITY'>(
    (searchParams.get('vertical') as 'GASTRO' | 'ACTIVITY') || 'GASTRO',
  );
  const [partnerId, setPartnerId] = useState(searchParams.get('partnerId') ?? '');
  const [adjustPesos, setAdjustPesos] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const gastroQuery = useAdminGastroLocationsList(
    { status: 'ACTIVE', page: 1, limit: 100 },
    'creditos-gastro',
  );
  const operatorsQuery = useQuery({
    queryKey: ['excursion-operators', 'creditos', TENANT_ID],
    queryFn: () =>
      repos.excursionOperators.listAdmin({ tenantId: TENANT_ID, includeInactive: false }),
  });

  const partnerOptions = useMemo(() => {
    if (vertical === 'GASTRO') {
      return (gastroQuery.data?.data ?? []).map((p) => ({ id: p.id, label: p.displayName }));
    }
    return (operatorsQuery.data?.data ?? []).map((p) => ({ id: p.id, label: p.name }));
  }, [vertical, gastroQuery.data, operatorsQuery.data]);

  const partnerQuery = useMemo(() => {
    if (!partnerId) return null;
    return {
      vertical,
      currency: 'ARS' as const,
      ...(vertical === 'GASTRO'
        ? { gastroProfileId: partnerId }
        : { excursionOperatorId: partnerId }),
    };
  }, [vertical, partnerId]);

  const { data: balance, isLoading: balanceLoading } = useAdminCourtesyCreditBalance(partnerQuery);
  const { data: entriesData, isLoading: entriesLoading } =
    useAdminCourtesyCreditLedgerList(partnerQuery);
  const adjustMutation = useCreateCourtesyCreditAdjustment();
  const reverseMutation = useReverseCourtesyCreditLedgerEntry();

  const selectedPartner = partnerOptions.find((p) => p.id === partnerId);

  const handleAdjust = async () => {
    setActionError(null);
    const amountCents = signedPesosToCentsString(adjustPesos);
    if (amountCents === '0' || !adjustReason.trim()) {
      setActionError('Ingresá monto (puede ser negativo) y motivo.');
      return;
    }
    const ok = window.confirm(
      'Los ajustes afectan el saldo contable y quedan auditados.\n\n¿Confirmar ajuste?',
    );
    if (!ok) return;
    try {
      await adjustMutation.mutateAsync({
        vertical,
        currency: 'ARS',
        amountCents,
        reason: adjustReason.trim(),
        ...(vertical === 'GASTRO'
          ? { gastroProfileId: partnerId }
          : { excursionOperatorId: partnerId }),
      });
      setAdjustPesos('');
      setAdjustReason('');
    } catch (err) {
      setActionError(mapBenefitSettlementErrorMessage(err));
    }
  };

  const handleReverse = async (entryId: string) => {
    setActionError(null);
    const reason = window.prompt('Motivo de reversión (obligatorio):');
    if (!reason?.trim()) return;
    const ok = window.confirm(
      'Esta acción crea un nuevo movimiento de reversión.\nEl movimiento original no se elimina.\n\n¿Confirmar?',
    );
    if (!ok) return;
    try {
      await reverseMutation.mutateAsync({ entryId, body: { reason: reason.trim() } });
    } catch (err) {
      setActionError(mapBenefitSettlementErrorMessage(err));
    }
  };

  return (
    <PageContainer>
      <LiquidacionesSubnav />
      <SectionTitle>Créditos de canje</SectionTitle>
      <p className="mt-2 max-w-2xl text-sm text-text-muted">
        Ledger de crédito por partner. Separado del cash de transferencias — no representa dinero
        cobrado.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <label className="text-sm text-text-muted">
          Vertical
          <select
            className="ml-2 rounded border border-border bg-bg px-2 py-1 text-text"
            value={vertical}
            onChange={(e) => {
              setVertical(e.target.value as 'GASTRO' | 'ACTIVITY');
              setPartnerId('');
            }}
          >
            <option value="GASTRO">Gastronómico</option>
            <option value="ACTIVITY">Activity</option>
          </select>
        </label>
        <label className="text-sm text-text-muted">
          Partner
          <select
            className="ml-2 max-w-[220px] rounded border border-border bg-bg px-2 py-1 text-text"
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
          >
            <option value="">Seleccionar…</option>
            {partnerOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        {partnerId ? (
          <Link
            href={`/admin/liquidaciones?vertical=${vertical}&partnerId=${partnerId}`}
            className="self-end text-sm text-accent hover:underline"
          >
            Ver liquidaciones
          </Link>
        ) : null}
      </div>

      {!partnerId ? (
        <EmptyState
          className="mt-8"
          title="Seleccioná un partner"
          description="Elegí vertical y partner para ver saldo y movimientos."
        />
      ) : (
        <>
          {actionError ? <p className="mt-4 text-sm text-red-500">{actionError}</p> : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border bg-bg-muted p-3">
              <p className="text-xs text-text-muted">Partner</p>
              <p className="mt-1 font-medium">{selectedPartner?.label ?? '—'}</p>
              <Badge className="mt-1">{BENEFIT_VERTICAL_LABEL[vertical]}</Badge>
            </div>
            <div className="rounded-lg border border-border bg-bg-muted p-3">
              <p className="text-xs text-text-muted">Saldo disponible</p>
              <p className="mt-1 text-lg font-semibold">
                {balanceLoading
                  ? '…'
                  : formatSignedBenefitMoneyCents(balance?.balanceAvailableCents ?? '0')}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-bg-muted p-3">
              <p className="text-xs text-text-muted">Crédito generado</p>
              <p className="mt-1 text-lg font-semibold">
                {balanceLoading
                  ? '…'
                  : formatBenefitMoneyCents(balance?.creditGeneratedCents ?? '0')}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-bg-muted p-3">
              <p className="text-xs text-text-muted">Crédito consumido</p>
              <p className="mt-1 text-lg font-semibold">
                {balanceLoading
                  ? '…'
                  : formatBenefitMoneyCents(balance?.creditConsumedCents ?? '0')}
              </p>
            </div>
          </div>

          {vertical === 'GASTRO' ? (
            <Link
              href={`/admin/gastronomicos/${partnerId}/cortesia`}
              className="mt-4 inline-block text-sm text-accent hover:underline"
            >
              Crear cortesía con saldo →
            </Link>
          ) : (
            <p className="mt-4 text-sm text-text-muted">
              Consumo de cortesías Activity: no disponible en V3.3.
            </p>
          )}

          <section className="mt-8">
            <h3 className="font-medium text-text">Movimientos</h3>
            {entriesLoading ? (
              <p className="mt-2 text-text-muted">Cargando…</p>
            ) : !entriesData?.data.length ? (
              <EmptyState
                className="mt-4"
                title="Sin movimientos"
                description="Este partner aún no tiene entradas en el ledger de canje."
              />
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-text-muted">
                      <th className="px-2 py-2">Fecha</th>
                      <th className="px-2 py-2">Tipo</th>
                      <th className="px-2 py-2">Monto</th>
                      <th className="px-2 py-2">Origen</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {entriesData.data.map((entry) => (
                      <tr key={entry.id} className="border-b border-border/60">
                        <td className="px-2 py-2">
                          {new Date(entry.createdAt).toLocaleDateString('es-AR')}
                        </td>
                        <td className="px-2 py-2">
                          {COURTESY_LEDGER_ENTRY_TYPE_LABEL[entry.type] ?? entry.type}
                        </td>
                        <td className="px-2 py-2">
                          {formatSignedBenefitMoneyCents(entry.amountCents)}
                        </td>
                        <td className="px-2 py-2 text-xs text-text-muted">
                          {entry.sourceAllocationId
                            ? 'Liquidación'
                            : entry.sourceCourtesyCampaignId
                              ? 'Cortesía'
                              : entry.adjustmentReason
                                ? entry.adjustmentReason
                                : entry.reversalOfEntryId
                                  ? 'Reversión'
                                  : '—'}
                        </td>
                        <td className="px-2 py-2">
                          {BigInt(entry.amountCents) > BigInt(0) && entry.type !== 'REVERSAL' ? (
                            <button
                              type="button"
                              className="text-accent hover:underline disabled:opacity-50"
                              disabled={reverseMutation.isPending}
                              onClick={() => handleReverse(entry.id)}
                            >
                              Revertir
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mt-8 rounded-lg border border-border p-4">
            <h3 className="font-medium text-text">Ajuste manual</h3>
            <p className="mt-1 text-sm text-amber-200/90">
              Los ajustes afectan el saldo contable y quedan auditados. No permite “setear saldo”.
            </p>
            <div className="mt-3 grid max-w-md gap-3">
              <label className="text-sm">
                Monto firmado (ARS; negativo para débito)
                <input
                  className="mt-1 w-full rounded border border-border bg-bg px-2 py-1"
                  placeholder="ej. 5000 o -5000"
                  value={adjustPesos}
                  onChange={(e) => setAdjustPesos(e.target.value)}
                />
              </label>
              <label className="text-sm">
                Motivo (obligatorio)
                <input
                  className="mt-1 w-full rounded border border-border bg-bg px-2 py-1"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                />
              </label>
              <Button disabled={adjustMutation.isPending} onClick={handleAdjust}>
                {adjustMutation.isPending ? 'Guardando…' : 'Crear ajuste'}
              </Button>
            </div>
          </section>
        </>
      )}
    </PageContainer>
  );
}
