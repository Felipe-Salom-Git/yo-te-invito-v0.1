import Link from 'next/link';
import type { GastroDiscountEconomicSummary } from '@yo-te-invito/shared';
import { Badge } from '@/components';
import {
  ECONOMIC_SUMMARY_COPY,
  collectionStatusLabel,
  periodLabel,
  settlementStatusLabel,
} from '@/lib/gastro/discount-economic-summary-ui';
import { EconomicBlock, EmptyLine, Hint, Money, PrecisionBadge } from './EconomicSummaryPrimitives';

/**
 * Block 5 — settlements where THIS discount has usage or payments.
 * Discount-level columns are EXACT; settlement totals (whole local + period) shown apart.
 */
export function DiscountEconomicSettlementsTable({
  summary,
  settlementHref,
}: {
  summary: GastroDiscountEconomicSummary;
  /** ADMIN only: link to the settlement detail. */
  settlementHref?: (settlementId: string) => string;
}) {
  const { settlements, currency } = summary;
  return (
    <EconomicBlock title="Liquidaciones">
      {settlements.length === 0 ? (
        <EmptyLine>{ECONOMIC_SUMMARY_COPY.noSettlements}</EmptyLine>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-bg-muted/60 text-left text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="px-3 py-2">Período</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">CASH generado</th>
                  <th className="px-3 py-2">CASH pagado</th>
                  <th className="px-3 py-2">CASH pendiente</th>
                  <th className="px-3 py-2">Canje base</th>
                  <th className="px-3 py-2">Precisión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {settlements.map((s) => (
                  <tr key={s.settlementId} className="align-top">
                    <td className="px-3 py-2">
                      {settlementHref ? (
                        <Link href={settlementHref(s.settlementId)} className="text-accent hover:underline">
                          {periodLabel(s.periodKey)}
                        </Link>
                      ) : (
                        periodLabel(s.periodKey)
                      )}
                      <div className="mt-1 flex flex-wrap gap-1">
                        {s.containsOtherDiscounts ? <Badge variant="muted">Incluye otros descuentos</Badge> : null}
                        {s.hasUnattributedTransfers ? <Badge variant="accent">Pagos sin atribuir</Badge> : null}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {settlementStatusLabel(s.status)}
                      <div className="text-xs text-text-muted">{collectionStatusLabel(s.discountCollectionStatus)}</div>
                    </td>
                    <td className="px-3 py-2"><Money cents={s.discountCashDueCents} currency={currency} /></td>
                    <td className="px-3 py-2"><Money cents={s.discountCashPaidCents} currency={currency} /></td>
                    <td className="px-3 py-2"><Money cents={s.discountCashRemainingCents} currency={currency} /></td>
                    <td className="px-3 py-2"><Money cents={s.discountBarterBaseCents} currency={currency} /></td>
                    <td className="px-3 py-2">
                      <PrecisionBadge precision={s.remainingPrecision} />
                      {s.containsOtherDiscounts || s.hasUnattributedTransfers ? (
                        <div className="mt-1 text-[11px] text-text-muted">
                          Liquidación completa: <Money cents={s.settlementCashDueCents} currency={currency} /> generado ·{' '}
                          <Money cents={s.settlementCashReceivedCents} currency={currency} /> recibido
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Hint>
            Las columnas CASH y Canje son de este descuento. La liquidación es del local por período y puede
            incluir otros descuentos: sus totales se muestran aparte y nunca se prorratean.
          </Hint>
        </>
      )}
    </EconomicBlock>
  );
}
