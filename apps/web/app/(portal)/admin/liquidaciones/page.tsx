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
import {
  useAdminBenefitSettlementsList,
  useGenerateAdminBenefitSettlement,
} from '@/lib/query/benefit-settlements';
import { useAdminGastroLocationsList } from '@/lib/query/admin-gastro';
import { useRepositories } from '@/repositories/context';
import { BENEFIT_VERTICAL_LABEL } from '@/lib/admin/benefit-agreement-labels';
import {
  BENEFIT_CASH_COLLECTION_STATUS_LABEL,
  BENEFIT_SETTLEMENT_STATUS_LABEL,
  formatBenefitMoneyCents,
  formatBenefitSettlementPeriodLabel,
  mapBenefitSettlementErrorMessage,
} from '@yo-te-invito/shared';

const TENANT_ID = 'tenant-demo';

function currentPeriodKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export default function AdminLiquidacionesPage() {
  const searchParams = useSearchParams();
  const repos = useRepositories();
  const [periodKey, setPeriodKey] = useState(
    searchParams.get('periodKey') ?? currentPeriodKey(),
  );
  const [vertical, setVertical] = useState(searchParams.get('vertical') ?? '');
  const [partnerId, setPartnerId] = useState(searchParams.get('partnerId') ?? '');
  const [status, setStatus] = useState('');
  const [cashStatus, setCashStatus] = useState('');
  const [showGenerate, setShowGenerate] = useState(false);
  const [genVertical, setGenVertical] = useState<'GASTRO' | 'ACTIVITY'>('GASTRO');
  const [genPartnerId, setGenPartnerId] = useState('');
  const [genPeriod, setGenPeriod] = useState(currentPeriodKey());
  const [genError, setGenError] = useState<string | null>(null);

  const listQuery = useMemo(
    () => ({
      periodKey: periodKey || undefined,
      ...(vertical ? { vertical } : {}),
      ...(vertical === 'GASTRO' && partnerId ? { gastroProfileId: partnerId } : {}),
      ...(vertical === 'ACTIVITY' && partnerId ? { excursionOperatorId: partnerId } : {}),
      ...(status ? { status } : {}),
      page: 1,
      pageSize: 50,
    }),
    [periodKey, vertical, partnerId, status],
  );

  const { data, isLoading, isError } = useAdminBenefitSettlementsList(listQuery);
  const generateMutation = useGenerateAdminBenefitSettlement();

  const gastroQuery = useAdminGastroLocationsList(
    { status: 'ACTIVE', page: 1, limit: 100 },
    'liquidaciones-filter-gastro',
  );
  const operatorsQuery = useQuery({
    queryKey: ['excursion-operators', 'liquidaciones', TENANT_ID],
    queryFn: () =>
      repos.excursionOperators.listAdmin({ tenantId: TENANT_ID, includeInactive: false }),
  });

  const partnerOptions = useMemo(() => {
    if (vertical === 'GASTRO') {
      return (gastroQuery.data?.data ?? []).map((p) => ({ id: p.id, label: p.displayName }));
    }
    if (vertical === 'ACTIVITY') {
      return (operatorsQuery.data?.data ?? []).map((p) => ({ id: p.id, label: p.name }));
    }
    return [];
  }, [vertical, gastroQuery.data, operatorsQuery.data]);

  const genPartnerOptions = useMemo(() => {
    if (genVertical === 'GASTRO') {
      return (gastroQuery.data?.data ?? []).map((p) => ({ id: p.id, label: p.displayName }));
    }
    return (operatorsQuery.data?.data ?? []).map((p) => ({ id: p.id, label: p.name }));
  }, [genVertical, gastroQuery.data, operatorsQuery.data]);

  const rows = useMemo(() => {
    const all = data?.data ?? [];
    if (!cashStatus) return all;
    return all.filter((r) => r.summary.cashCollectionStatus === cashStatus);
  }, [data, cashStatus]);

  const periodSummary = useMemo(() => {
    let cashOutstanding = BigInt(0);
    let cashReceived = BigInt(0);
    let creditGenerated = BigInt(0);
    for (const row of rows) {
      cashOutstanding += BigInt(row.summary.cashOutstandingCents);
      cashReceived += BigInt(row.summary.cashReceivedCents);
      const mat =
        row.summary.barterCreditMaterializedCents ??
        row.summary.barterCreditExpectedCents ??
        '0';
      creditGenerated += BigInt(mat);
    }
    return { cashOutstanding, cashReceived, creditGenerated, count: rows.length };
  }, [rows]);

  const handleGenerate = async () => {
    setGenError(null);
    if (!genPartnerId) {
      setGenError('Seleccioná un partner.');
      return;
    }
    try {
      const result = await generateMutation.mutateAsync({
        vertical: genVertical,
        periodKey: genPeriod,
        ...(genVertical === 'GASTRO'
          ? { gastroProfileId: genPartnerId }
          : { excursionOperatorId: genPartnerId }),
      });
      setShowGenerate(false);
      window.location.href = `/admin/liquidaciones/${result.id}`;
    } catch (err) {
      setGenError(mapBenefitSettlementErrorMessage(err));
    }
  };

  return (
    <PageContainer>
      <LiquidacionesSubnav />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionTitle>Liquidaciones</SectionTitle>
          <p className="mt-2 max-w-3xl text-sm text-text-muted">
            Conciliación de usos validados por partner y período. Cash (transferencias) y crédito de
            canje se muestran por separado — nunca se suman en un único total.
          </p>
        </div>
        <Button onClick={() => setShowGenerate(true)}>Generar liquidación</Button>
      </div>

      {rows.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-bg-muted p-3 text-sm">
            <p className="text-text-muted">Liquidaciones (filtro)</p>
            <p className="text-lg font-semibold text-text">{periodSummary.count}</p>
          </div>
          <div className="rounded-lg border border-border bg-bg-muted p-3 text-sm">
            <p className="text-text-muted">Cash pendiente (ARS)</p>
            <p className="text-lg font-semibold text-text">
              {formatBenefitMoneyCents(periodSummary.cashOutstanding.toString())}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-bg-muted p-3 text-sm">
            <p className="text-text-muted">Cash recibido (ARS)</p>
            <p className="text-lg font-semibold text-text">
              {formatBenefitMoneyCents(periodSummary.cashReceived.toString())}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-bg-muted p-3 text-sm">
            <p className="text-text-muted">Crédito canje materializado</p>
            <p className="text-lg font-semibold text-text">
              {formatBenefitMoneyCents(periodSummary.creditGenerated.toString())}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <label className="text-sm text-text-muted">
          Período
          <input
            type="month"
            className="ml-2 rounded border border-border bg-bg px-2 py-1 text-text"
            value={periodKey}
            onChange={(e) => setPeriodKey(e.target.value)}
          />
        </label>
        <label className="text-sm text-text-muted">
          Vertical
          <select
            className="ml-2 rounded border border-border bg-bg px-2 py-1 text-text"
            value={vertical}
            onChange={(e) => {
              setVertical(e.target.value);
              setPartnerId('');
            }}
          >
            <option value="">Todas</option>
            <option value="GASTRO">Gastronómico</option>
            <option value="ACTIVITY">Activity</option>
          </select>
        </label>
        {vertical ? (
          <label className="text-sm text-text-muted">
            Partner
            <select
              className="ml-2 max-w-[200px] rounded border border-border bg-bg px-2 py-1 text-text"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
            >
              <option value="">Todos</option>
              {partnerOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="text-sm text-text-muted">
          Estado
          <select
            className="ml-2 rounded border border-border bg-bg px-2 py-1 text-text"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos</option>
            {Object.entries(BENEFIT_SETTLEMENT_STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-text-muted">
          Cobranza cash
          <select
            className="ml-2 rounded border border-border bg-bg px-2 py-1 text-text"
            value={cashStatus}
            onChange={(e) => setCashStatus(e.target.value)}
          >
            <option value="">Todas</option>
            {Object.entries(BENEFIT_CASH_COLLECTION_STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>

      {showGenerate ? (
        <div className="mt-6 rounded-lg border border-border bg-bg-muted p-4">
          <h3 className="font-medium text-text">Generar liquidación</h3>
          <div className="mt-4 grid max-w-lg gap-3">
            <label className="text-sm">
              Vertical
              <select
                className="mt-1 w-full rounded border border-border bg-bg px-2 py-1"
                value={genVertical}
                onChange={(e) => {
                  setGenVertical(e.target.value as 'GASTRO' | 'ACTIVITY');
                  setGenPartnerId('');
                }}
              >
                <option value="GASTRO">Gastronómico</option>
                <option value="ACTIVITY">Activity</option>
              </select>
            </label>
            <label className="text-sm">
              Partner
              <select
                className="mt-1 w-full rounded border border-border bg-bg px-2 py-1"
                value={genPartnerId}
                onChange={(e) => setGenPartnerId(e.target.value)}
              >
                <option value="">Seleccionar…</option>
                {genPartnerOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Período
              <input
                type="month"
                className="mt-1 w-full rounded border border-border bg-bg px-2 py-1"
                value={genPeriod}
                onChange={(e) => setGenPeriod(e.target.value)}
              />
            </label>
            {genError ? (
              <p className="text-sm text-red-500">
                {genError}
                {genError.includes('acuerdo') ? (
                  <>
                    {' '}
                    <Link href="/admin/liquidaciones/acuerdos" className="underline">
                      Ver acuerdos
                    </Link>
                  </>
                ) : null}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button disabled={generateMutation.isPending} onClick={handleGenerate}>
                {generateMutation.isPending ? 'Generando…' : 'Confirmar'}
              </Button>
              <Button variant="secondary" onClick={() => setShowGenerate(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <p className="mt-6 text-text-muted">Cargando…</p>
      ) : isError ? (
        <p className="mt-6 text-sm text-red-500">No se pudieron cargar las liquidaciones.</p>
      ) : !rows.length ? (
        <EmptyState
          className="mt-8"
          title="No hay liquidaciones para este período"
          description="Generá una liquidación para un partner o ajustá los filtros."
        />
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="px-2 py-2">Partner</th>
                <th className="px-2 py-2">Período</th>
                <th className="px-2 py-2">Estado</th>
                <th className="px-2 py-2">Usos</th>
                <th className="px-2 py-2">Cash</th>
                <th className="px-2 py-2">Canje</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="px-2 py-3">
                    <div className="font-medium">{row.partnerDisplayName ?? '—'}</div>
                    <Badge className="mt-1">{BENEFIT_VERTICAL_LABEL[row.vertical]}</Badge>
                  </td>
                  <td className="px-2 py-3">{formatBenefitSettlementPeriodLabel(row.periodKey)}</td>
                  <td className="px-2 py-3">
                    <Badge>{BENEFIT_SETTLEMENT_STATUS_LABEL[row.status]}</Badge>
                    <div className="mt-1 text-xs text-text-muted">
                      {BENEFIT_CASH_COLLECTION_STATUS_LABEL[row.summary.cashCollectionStatus]}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-xs">
                    <div>Elegibles: {row.summary.eligibleUsageCount}</div>
                    <div>CASH: {row.summary.allocatedCashCount}</div>
                    <div>BARTER: {row.summary.allocatedBarterCount}</div>
                    <div>Pendientes: {row.summary.pendingUsageCount}</div>
                  </td>
                  <td className="px-2 py-3 text-xs">
                    <div>Due: {formatBenefitMoneyCents(row.summary.cashDueCents)}</div>
                    <div>Recibido: {formatBenefitMoneyCents(row.summary.cashReceivedCents)}</div>
                    <div>Pendiente: {formatBenefitMoneyCents(row.summary.cashOutstandingCents)}</div>
                  </td>
                  <td className="px-2 py-3 text-xs">
                    <div>Base: {formatBenefitMoneyCents(row.summary.barterBaseAmountCents)}</div>
                    <div>
                      Crédito:{' '}
                      {formatBenefitMoneyCents(
                        row.summary.barterCreditMaterializedCents ??
                          row.summary.barterCreditExpectedCents ??
                          '0',
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <Link
                      href={`/admin/liquidaciones/${row.id}`}
                      className="text-accent hover:underline"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}
