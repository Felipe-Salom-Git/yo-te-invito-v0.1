import type { ReactNode } from 'react';
import type { GastroDiscountEconomicSummary } from '@yo-te-invito/shared';
import { DiscountEconomicContractBlock } from './DiscountEconomicContractBlock';
import {
  DiscountEconomicBarterBlock,
  DiscountEconomicCashBlock,
  DiscountEconomicValidationsBlock,
} from './DiscountEconomicFiguresBlocks';
import { DiscountEconomicHistoryList } from './DiscountEconomicHistoryList';
import { DiscountEconomicPaymentsTable } from './DiscountEconomicPaymentsTable';
import { DiscountEconomicSettlementsTable } from './DiscountEconomicSettlementsTable';
import { Hint } from './EconomicSummaryPrimitives';

type Props = {
  summary: GastroDiscountEconomicSummary;
  title: string;
  missingContractAction?: ReactNode;
  settlementHref?: (settlementId: string) => string;
  /** G10.D — ADMIN-only write actions (the GASTRO portal never passes them). */
  settleValidationsSlot?: ReactNode;
  paymentsAside?: ReactNode;
  paymentRowAction?: (payment: GastroDiscountEconomicSummary['payments'][number]) => ReactNode;
};

/**
 * G10.C — per-discount economic summary, ADMIN and GASTRO.
 * The ADMIN/GASTRO difference comes from the payload (`audience`), never from hidden UI only.
 */
export function DiscountEconomicSummaryView({
  summary,
  title,
  missingContractAction,
  settlementHref,
  settleValidationsSlot,
  paymentsAside,
  paymentRowAction,
}: Props) {
  return (
    <section
      id="metricas-economicas"
      className="mt-8 rounded-xl border border-border bg-bg-muted/40 p-4 sm:p-5"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">{title}</h2>
      <Hint>
        Cifras del contrato de este descuento. CASH generado y pagado son exactos por descuento; las cifras de
        liquidación y el saldo de canje del local se muestran rotulados aparte.
      </Hint>
      <DiscountEconomicContractBlock summary={summary} missingContractAction={missingContractAction} />
      <DiscountEconomicValidationsBlock summary={summary} />
      {settleValidationsSlot}
      <DiscountEconomicCashBlock summary={summary} />
      <DiscountEconomicBarterBlock summary={summary} />
      <DiscountEconomicSettlementsTable summary={summary} settlementHref={settlementHref} />
      <DiscountEconomicPaymentsTable summary={summary} aside={paymentsAside} rowAction={paymentRowAction} />
      <DiscountEconomicHistoryList summary={summary} />
    </section>
  );
}
