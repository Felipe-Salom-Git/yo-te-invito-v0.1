import {
  FUNDED_COURTESY_NOT_BILLABLE_LABEL,
  formatSignedBenefitMoneyCents,
  type GastroDiscountEconomicSummary,
} from '@yo-te-invito/shared';
import {
  ECONOMIC_SUMMARY_COPY,
  shouldWarnUnattributedPayments,
} from '@/lib/gastro/discount-economic-summary-ui';
import { EconomicBlock, EmptyLine, Hint, Money, PrecisionBadge, StatCard } from './EconomicSummaryPrimitives';

type Props = { summary: GastroDiscountEconomicSummary };

/** Block 2 — validations of THIS discount; funded courtesy kept apart (operational, not billable). */
export function DiscountEconomicValidationsBlock({ summary }: Props) {
  const v = summary.validations;
  const funded = summary.discount.settlementBillability === 'FUNDED_COURTESY_NOT_BILLABLE';
  return (
    <EconomicBlock title="Validaciones">
      {v.total === 0 ? (
        <EmptyLine>{ECONOMIC_SUMMARY_COPY.noValidations}</EmptyLine>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Totales" value={v.total} />
          <StatCard label="Facturables" value={v.billable} />
          <StatCard label="Liquidadas" value={v.allocated} />
          <StatCard label="Pendientes" value={v.pending} />
          <StatCard
            label="Pendientes sin contrato"
            value={v.pendingWithoutAgreement}
            hint={v.pendingWithoutAgreement > 0 ? 'No se pueden liquidar hasta cargar el contrato.' : undefined}
          />
        </div>
      )}
      {funded || v.fundedCourtesy > 0 ? (
        <div className="mt-3 rounded-lg border border-border bg-bg p-3 text-sm">
          <p className="font-medium text-text">{FUNDED_COURTESY_NOT_BILLABLE_LABEL}</p>
          <p className="mt-1 text-text-muted">
            {v.fundedCourtesy} uso(s) operativo(s): no entran en liquidaciones ni generan CASH, canje ni
            crédito nuevo.
          </p>
        </div>
      ) : null}
    </EconomicBlock>
  );
}

/** Block 3 — CASH generated / paid / remaining of THIS discount. */
export function DiscountEconomicCashBlock({ summary }: Props) {
  const { cash, currency } = summary;
  return (
    <EconomicBlock title="CASH" aside={<PrecisionBadge precision={cash.remainingPrecision} />}>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Generado" value={<Money cents={cash.generatedCents} currency={currency} />} hint={`${cash.usageCount} uso(s) asignados a CASH`} />
        <StatCard label="Pagado" value={<Money cents={cash.paidCents} currency={currency} />} hint="Pagos atribuidos a este descuento" />
        <StatCard label="Pendiente" value={<Money cents={cash.remainingCents} currency={currency} />} />
      </div>
      {shouldWarnUnattributedPayments(summary) ? (
        <div role="alert" className="mt-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
          <p className="text-text">{ECONOMIC_SUMMARY_COPY.unattributedWarning}</p>
          <p className="mt-1 text-text-muted">
            Pagos sin atribuir en esas liquidaciones:{' '}
            <Money cents={cash.unattributedSettlementReceivedCents} currency={currency} />
          </p>
        </div>
      ) : null}
    </EconomicBlock>
  );
}

/** Block 4 — CANJE: base and credit generated (credit belongs to the local's general balance). */
export function DiscountEconomicBarterBlock({ summary }: Props) {
  const { barter, currency, partnerCredit } = summary;
  return (
    <EconomicBlock title="Canje">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Usos asignados a canje" value={barter.usageCount} />
        <StatCard label="Base" value={<Money cents={barter.baseCents} currency={currency} />} />
        <StatCard label="Crédito generado" value={<Money cents={barter.creditGeneratedCents} currency={currency} />} />
      </div>
      <Hint>
        {ECONOMIC_SUMMARY_COPY.barterPartnerNote} {ECONOMIC_SUMMARY_COPY.cashCreditSeparation}
      </Hint>
      {partnerCredit ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-text-muted">{ECONOMIC_SUMMARY_COPY.partnerBalanceLabel}:</span>
          <span className="font-medium text-text">
            {formatSignedBenefitMoneyCents(partnerCredit.balanceAvailableCents, partnerCredit.currency)}
          </span>
          <PrecisionBadge precision="PARTNER_LEVEL" />
        </div>
      ) : null}
    </EconomicBlock>
  );
}
