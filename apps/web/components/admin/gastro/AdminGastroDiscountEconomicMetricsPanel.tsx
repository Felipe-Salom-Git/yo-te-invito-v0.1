'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  formatBenefitMoneyCents,
  type GastroDiscountEconomicMetricsResponse,
} from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { adminGastroKeys } from '@/lib/query/keys';

type Props = {
  profileId: string;
  discountId: string;
};

function Hint({ children }: { children: string }) {
  return <p className="mt-0.5 text-[11px] leading-snug text-text-muted">{children}</p>;
}

function Money({ cents, currency = 'ARS' }: { cents: string; currency?: string }) {
  return <span className="font-medium text-text">{formatBenefitMoneyCents(cents, currency)}</span>;
}

/**
 * G6 — Economic metrics for one discount. Never mixes CASH+BARTER as "total cobrado".
 * Settlement transfers and partner courtesy balance are labeled as non-discount-exclusive.
 */
export function AdminGastroDiscountEconomicMetricsPanel({ profileId, discountId }: Props) {
  const repos = useRepositories();
  const query = useQuery({
    queryKey: adminGastroKeys.economicMetrics(profileId, discountId),
    queryFn: () => repos.adminGastro.getDiscountEconomicMetrics(profileId, discountId),
    enabled: !!profileId && !!discountId,
  });

  if (query.isLoading) {
    return <p className="mt-8 text-sm text-text-muted">Cargando métricas económicas…</p>;
  }
  if (query.isError || !query.data) {
    return (
      <p className="mt-8 text-sm text-text-muted">
        No se pudieron cargar las métricas económicas de este descuento.
      </p>
    );
  }

  return <EconomicBody metrics={query.data} profileId={profileId} />;
}

function EconomicBody({
  metrics,
  profileId,
}: {
  metrics: GastroDiscountEconomicMetricsResponse;
  profileId: string;
}) {
  const { cash, barter, snapshotSegments, settlements, partner } = metrics;

  return (
    <section className="mt-8 rounded-xl border border-border bg-bg-muted/40 p-4 sm:p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
        Métricas económicas
      </h2>
      <Hint>
        Solo usos ya liquidados (allocations). Las validaciones sin allocation no generan base CASH/BARTER.
        CASH y crédito BARTER no se suman como un único “total cobrado”.
      </Hint>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div>
          <p className="text-text-muted">Validaciones (con claim)</p>
          <p className="mt-0.5 font-medium text-text">{metrics.validatedUsageCount}</p>
          <Hint>EXACT — validaciones del descuento</Hint>
        </div>
        <div>
          <p className="text-text-muted">Usos liquidados</p>
          <p className="mt-0.5 font-medium text-text">{metrics.allocatedUsageCount}</p>
          <Hint>EXACT — allocations atribuibles</Hint>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-bg p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">CASH</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-text-muted">Usos CASH</dt>
              <dd className="font-medium text-text">{cash.usageCount}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-text-muted">Base CASH atribuible</dt>
              <dd>
                <Money cents={cash.baseAmountCents} currency={metrics.currency} />
              </dd>
            </div>
          </dl>
          <Hint>
            Base = Σ unitPriceCents snapshot de allocations CASH de este descuento (EXACT). No es
            “transferido”.
          </Hint>
        </div>

        <div className="rounded-lg border border-border bg-bg p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">BARTER</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-text-muted">Usos BARTER</dt>
              <dd className="font-medium text-text">{barter.usageCount}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-text-muted">Base BARTER atribuible</dt>
              <dd>
                <Money cents={barter.baseAmountCents} currency={metrics.currency} />
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-text-muted">Crédito generado por este descuento</dt>
              <dd>
                <Money cents={barter.creditGeneratedCents} currency={metrics.currency} />
              </dd>
            </div>
          </dl>
          <Hint>
            Crédito = ledger CREDIT_FROM_SETTLEMENT con sourceAllocationId ∈ allocations BARTER de
            este descuento (EXACT). No implica “crédito consumido por este descuento”.
          </Hint>
        </div>
      </div>

      {snapshotSegments.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Snapshots de tarifa (históricos)
          </h3>
          <Hint>
            Varias tarifas posibles si el agreement del local cambió. No hay un único unit price
            engañoso.
          </Hint>
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border text-sm">
            {snapshotSegments.map((seg) => (
              <li
                key={`${seg.agreementId}-${seg.unitPriceCents}-${seg.barterMultiplier}`}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              >
                <span>
                  <Money cents={seg.unitPriceCents} currency={seg.currency} /> / uso · canje ×
                  {seg.barterMultiplier} · {seg.usageCount} uso(s) · {seg.modes.join('+')}
                </span>
                <span className="text-text-muted">
                  Base <Money cents={seg.baseAmountCents} currency={seg.currency} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-6 text-sm text-text-muted">
          Sin allocations aún — no hay base económica ni snapshots para este descuento.
        </p>
      )}

      {settlements.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Liquidaciones relacionadas (settlement)
          </h3>
          <Hint>
            Transferido / pendiente son del settlement completo (SETTLEMENT_LEVEL), no exclusivos de
            este descuento.
          </Hint>
          <ul className="mt-3 space-y-3">
            {settlements.map((s) => (
              <li
                key={s.settlementId}
                className="rounded-lg border border-border bg-bg p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-text">
                    Settlement {s.periodKey}{' '}
                    <span className="text-text-muted font-normal">({s.status})</span>
                  </p>
                  <Link
                    href={`/admin/liquidaciones/${s.settlementId}`}
                    className="text-accent hover:underline"
                  >
                    Ver liquidación →
                  </Link>
                </div>
                <dl className="mt-2 grid gap-1 sm:grid-cols-2">
                  <div>
                    Base CASH de este descuento en el settlement:{' '}
                    <Money cents={s.discountCashBaseCents} />
                  </div>
                  <div>
                    Base BARTER de este descuento en el settlement:{' '}
                    <Money cents={s.discountBarterBaseCents} />
                  </div>
                  <div>
                    Transferido del settlement:{' '}
                    <Money cents={s.settlementCashReceivedCents} />
                  </div>
                  <div>
                    Pendiente del settlement:{' '}
                    <Money cents={s.settlementCashOutstandingCents} />
                  </div>
                </dl>
                {s.containsOtherDiscounts ? (
                  <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">
                    Este settlement incluye allocations de otros descuentos (
                    {s.settlementTotalAllocationCount} usos totales). El transferido no se prorratea
                    a este ticket.
                  </p>
                ) : (
                  <p className="mt-2 text-[11px] text-text-muted">
                    Due settlement: <Money cents={s.settlementCashDueCents} /> · usos del descuento
                    en settlement: {s.discountAllocationCount}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {partner ? (
        <div className="mt-6 rounded-lg border border-border bg-bg p-4 text-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Cortesía del local (partner)
          </h3>
          <Hint>
            PARTNER_LEVEL — saldo y consumo global del GastroProfile, no “saldo de este descuento”.
          </Hint>
          <dl className="mt-3 grid gap-2 sm:grid-cols-3">
            <div>
              <dt className="text-text-muted">Saldo actual del local</dt>
              <dd className="mt-0.5">
                <Money cents={partner.balanceAvailableCents} currency={partner.currency} />
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Crédito generado (partner)</dt>
              <dd className="mt-0.5">
                <Money cents={partner.creditGeneratedCents} currency={partner.currency} />
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Crédito consumido (partner)</dt>
              <dd className="mt-0.5">
                <Money cents={partner.creditConsumedCents} currency={partner.currency} />
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-text-muted">
            <Link
              href={`/admin/gastronomicos/${profileId}/cortesia`}
              className="text-accent hover:underline"
            >
              Ver cortesías del local
            </Link>
            {' · '}
            <Link href="/admin/liquidaciones/creditos" className="text-accent hover:underline">
              Ledger de créditos
            </Link>
          </p>
        </div>
      ) : null}
    </section>
  );
}
