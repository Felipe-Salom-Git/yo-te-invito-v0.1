'use client';

import Link from 'next/link';
import {
  BENEFIT_SETTLEMENT_STATUS_LABEL,
  formatBarterMultiplierLabel,
  formatBenefitMoneyCents,
  formatBenefitSettlementPeriodLabel,
  groupSettlementAllocationsByRate,
  type BenefitSettlementAuditResponse,
  type BenefitSettlementDto,
} from '@yo-te-invito/shared';
import { BENEFIT_VERTICAL_LABEL } from '@/lib/admin/benefit-agreement-labels';

type Props = {
  settlement: BenefitSettlementDto;
  audit: BenefitSettlementAuditResponse | undefined;
  agreementHref: string;
};

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <dt className="text-text-muted">{label}</dt>
      <dd className={strong ? 'font-semibold text-text' : 'text-text'}>{value}</dd>
    </div>
  );
}

/** G7.12.1 — settlement header: partner/period/status, agreements, CASH and BARTER blocks. */
export function SettlementOverviewSection({ settlement, audit, agreementHref }: Props) {
  const { summary } = settlement;
  const allocations = audit?.allocations ?? [];
  const cashRates = groupSettlementAllocationsByRate(allocations, 'CASH');
  const barterRates = groupSettlementAllocationsByRate(allocations, 'BARTER');
  const barterCredit =
    summary.barterCreditMaterializedCents ?? summary.barterCreditExpectedCents ?? '0';
  const multipliers = [...new Set(barterRates.map((r) => formatBarterMultiplierLabel(r.barterMultiplier)))];

  return (
    <section className="mt-8 space-y-4">
      <div className="rounded-lg border border-border bg-bg-muted/40 p-4">
        <dl className="grid gap-x-8 text-sm sm:grid-cols-2">
          <Row label="Partner" value={settlement.partnerDisplayName ?? '—'} />
          <Row label="Vertical" value={BENEFIT_VERTICAL_LABEL[settlement.vertical]} />
          <Row label="Período" value={formatBenefitSettlementPeriodLabel(settlement.periodKey)} />
          <Row label="Estado (persistido)" value={BENEFIT_SETTLEMENT_STATUS_LABEL[settlement.status]} />
          <Row label="Usos incluidos" value={String(summary.eligibleUsageCount)} strong />
          <Row
            label="Valor base total"
            value={formatBenefitMoneyCents(summary.eligibleBaseAmountCents)}
            strong
          />
          <Row
            label="Pendientes de asignar"
            value={`${summary.pendingUsageCount} · ${formatBenefitMoneyCents(summary.pendingBaseAmountCents)}`}
          />
          {summary.fundedCourtesyUsageCount ? (
            <Row
              label="Cortesías financiadas con crédito (no facturables)"
              value={String(summary.fundedCourtesyUsageCount)}
            />
          ) : null}
        </dl>
        <div className="mt-3 border-t border-border/60 pt-3 text-sm">
          <p className="text-text-muted">Acuerdo(s) aplicados en asignaciones</p>
          {audit && audit.agreements.length > 0 ? (
            <ul className="mt-1 space-y-0.5">
              {audit.agreements.map((a) => (
                <li key={a.agreementId} className="text-text">
                  {formatBenefitMoneyCents(a.unitPriceCents, a.currency)} / uso ·{' '}
                  {formatBarterMultiplierLabel(a.barterMultiplier)} canje · {a.validFrom}
                  {a.validTo ? ` → ${a.validTo}` : ' → abierto'}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-text-muted">Sin asignaciones todavía.</p>
          )}
          <Link href={agreementHref} className="mt-1 inline-block text-accent hover:underline">
            Ver acuerdo comercial del partner
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border p-4">
          <h3 className="font-medium text-text">CASH — transferencia</h3>
          <dl className="mt-2 text-sm">
            <Row label="Usos" value={String(summary.allocatedCashCount)} />
            <Row label="Base" value={formatBenefitMoneyCents(summary.cashBaseAmountCents)} />
            {cashRates.map((r) => (
              <Row
                key={`${r.agreementId}-${r.unitPriceCents}`}
                label={`  ${r.usageCount} × ${formatBenefitMoneyCents(r.unitPriceCents)}`}
                value={formatBenefitMoneyCents(r.baseAmountCents)}
              />
            ))}
            <Row label="Transferido" value={formatBenefitMoneyCents(summary.cashReceivedCents)} />
            <Row
              label="Pendiente"
              value={formatBenefitMoneyCents(summary.cashOutstandingCents)}
              strong
            />
          </dl>
        </div>
        <div className="rounded-lg border border-border p-4">
          <h3 className="font-medium text-text">BARTER — canje</h3>
          <dl className="mt-2 text-sm">
            <Row label="Usos" value={String(summary.allocatedBarterCount)} />
            <Row label="Base" value={formatBenefitMoneyCents(summary.barterBaseAmountCents)} />
            <Row label="Multiplicador" value={multipliers.length ? multipliers.join(' / ') : '—'} />
            <Row label="Crédito generado" value={formatBenefitMoneyCents(barterCredit)} strong />
          </dl>
          <p className="mt-2 text-xs text-text-muted">Crédito de canje ≠ dinero recibido.</p>
        </div>
      </div>
    </section>
  );
}
