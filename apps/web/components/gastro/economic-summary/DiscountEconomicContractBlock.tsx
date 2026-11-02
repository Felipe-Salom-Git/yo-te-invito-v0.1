import type { ReactNode } from 'react';
import { formatBenefitMoneyCents, type GastroDiscountEconomicSummary } from '@yo-te-invito/shared';
import {
  ECONOMIC_SUMMARY_COPY,
  formatAgreementVigency,
  resolveEconomicContractState,
} from '@/lib/gastro/discount-economic-summary-ui';
import { EconomicBlock, EmptyLine, Hint, PrecisionBadge } from './EconomicSummaryPrimitives';

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-text">{value}</dd>
    </div>
  );
}

/** Block 1 — the discount's own contract (never the local's) + legacy rows that priced its uses. */
export function DiscountEconomicContractBlock({
  summary,
  missingContractAction,
}: {
  summary: GastroDiscountEconomicSummary;
  /** ADMIN: link to the B3 contract panel. GASTRO: never an edit action. */
  missingContractAction?: ReactNode;
}) {
  const state = resolveEconomicContractState(summary);
  const current = summary.agreement.current;
  const isAdmin = summary.audience === 'ADMIN';

  return (
    <EconomicBlock title="Contrato del descuento">
      {state === 'NOT_BILLABLE' ? <EmptyLine>{ECONOMIC_SUMMARY_COPY.notBillable}</EmptyLine> : null}
      {state === 'NONE' ? (
        <div role="alert" className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
          <p className="font-medium text-text">
            {isAdmin ? ECONOMIC_SUMMARY_COPY.noContractAdmin : ECONOMIC_SUMMARY_COPY.noContractGastro}
          </p>
          {missingContractAction ? <div className="mt-2">{missingContractAction}</div> : null}
        </div>
      ) : null}
      {current ? (
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Term label="Contrato vigente" value="Contrato del descuento" />
          <Term
            label="Valor por validación"
            value={formatBenefitMoneyCents(current.unitPriceCents, current.currency)}
          />
          <Term label="Multiplicador de canje" value={`×${current.barterMultiplier}`} />
          <Term label="Vigencia" value={formatAgreementVigency(current)} />
        </dl>
      ) : null}
      {summary.agreement.legacyUsed.length > 0 ? (
        <div className="mt-3 rounded-lg border border-border bg-bg p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-text">Usos históricos valuados con el contrato del local</p>
            <PrecisionBadge precision="PARTNER_LEVEL_LEGACY" />
          </div>
          <ul className="mt-2 space-y-1 text-text-muted">
            {summary.agreement.legacyUsed.map(({ agreement, usageCount }) => (
              <li key={agreement.id}>
                {formatBenefitMoneyCents(agreement.unitPriceCents, agreement.currency)} / validación · canje ×
                {agreement.barterMultiplier} · {formatAgreementVigency(agreement)} · {usageCount} uso(s)
              </li>
            ))}
          </ul>
          <Hint>Snapshot histórico anterior a los contratos por descuento: sigue contando con su valor original.</Hint>
        </div>
      ) : null}
    </EconomicBlock>
  );
}
