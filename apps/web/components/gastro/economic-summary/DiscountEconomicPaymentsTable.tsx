import type { ReactNode } from 'react';
import type { GastroDiscountEconomicSummary } from '@yo-te-invito/shared';
import { Badge } from '@/components';
import { ECONOMIC_SUMMARY_COPY, periodLabel } from '@/lib/gastro/discount-economic-summary-ui';
import { EconomicBlock, EmptyLine, Hint, Money } from './EconomicSummaryPrimitives';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR');
}

type PaymentRow = GastroDiscountEconomicSummary['payments'][number];

/**
 * Block 6 — CASH payments attributed to THIS discount. ADMIN write actions arrive through
 * `aside` / `rowAction` slots (G10.D); the GASTRO portal never passes them.
 * The proof column exists only in the ADMIN variant (GASTRO never receives proofUrl).
 */
export function DiscountEconomicPaymentsTable({
  summary,
  aside,
  rowAction,
}: {
  summary: GastroDiscountEconomicSummary;
  aside?: ReactNode;
  rowAction?: (payment: PaymentRow) => ReactNode;
}) {
  const isAdmin = summary.audience === 'ADMIN';
  const rows: ReadonlyArray<PaymentRow> = summary.payments;
  return (
    <EconomicBlock title="Pagos" aside={aside}>
      {rows.length === 0 ? (
        <EmptyLine>{ECONOMIC_SUMMARY_COPY.noPayments}</EmptyLine>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-bg-muted/60 text-left text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Monto</th>
                <th className="px-3 py-2">Referencia</th>
                <th className="px-3 py-2">Período</th>
                <th className="px-3 py-2">Estado</th>
                {isAdmin ? <th className="px-3 py-2">Comprobante</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((p) => (
                <tr key={p.transferId} className="align-top">
                  <td className="px-3 py-2">{formatDate(p.transferredAt)}</td>
                  <td className="px-3 py-2">
                    <span className={p.isActive ? '' : 'line-through opacity-70'}>
                      <Money cents={p.amountCents} currency={p.currency} />
                    </span>
                  </td>
                  <td className="px-3 py-2">{p.reference ?? '—'}</td>
                  <td className="px-3 py-2">{periodLabel(p.periodKey)}</td>
                  <td className="px-3 py-2">
                    {p.isActive ? (
                      <Badge variant="muted">Registrado</Badge>
                    ) : (
                      <>
                        <Badge variant="accent">Revertido</Badge>
                        {p.reversalReason ? <div className="mt-1 text-xs text-text-muted">{p.reversalReason}</div> : null}
                      </>
                    )}
                    {'registeredBy' in p && p.registeredBy ? (
                      <div className="mt-1 text-xs text-text-muted">
                        Registró: {p.registeredBy.label}
                        {p.reversedBy ? ` · Revirtió: ${p.reversedBy.label}` : ''}
                      </div>
                    ) : null}
                    {'notes' in p && p.notes ? <div className="mt-1 text-xs text-text-muted">Notas: {p.notes}</div> : null}
                    {rowAction ? rowAction(p) : null}
                  </td>
                  {isAdmin ? (
                    <td className="px-3 py-2">
                      {'proofUrl' in p && p.proofUrl ? (
                        <a href={p.proofUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                          Ver comprobante
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Hint>Solo pagos atribuidos a este descuento. Los pagos del local sin descuento no se reparten.</Hint>
    </EconomicBlock>
  );
}
