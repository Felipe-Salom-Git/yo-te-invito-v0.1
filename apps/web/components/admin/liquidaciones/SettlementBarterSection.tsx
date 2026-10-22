'use client';

import Link from 'next/link';
import {
  formatBarterMultiplierLabel,
  formatBenefitMoneyCents,
  formatSignedBenefitMoneyCents,
  groupSettlementAllocationsByRate,
  type BenefitSettlementAuditResponse,
  type BenefitSettlementDto,
} from '@yo-te-invito/shared';
import { useAdminCourtesyCreditBalance } from '@/lib/query/courtesy-credit-ledger';

type Props = {
  settlement: BenefitSettlementDto;
  audit: BenefitSettlementAuditResponse | undefined;
  ledgerHref: string;
};

/**
 * G7.12.7 — BARTER allocations by snapshot (EXACT) + partner courtesy balance (PARTNER_LEVEL).
 * Balance comes from CourtesyCreditLedgerEntry; no second balance is computed here.
 */
export function SettlementBarterSection({ settlement, audit, ledgerHref }: Props) {
  const { summary } = settlement;
  const partnerQuery = settlement.gastroProfileId
    ? { vertical: settlement.vertical, gastroProfileId: settlement.gastroProfileId, currency: 'ARS' as const }
    : settlement.excursionOperatorId
      ? {
          vertical: settlement.vertical,
          excursionOperatorId: settlement.excursionOperatorId,
          currency: 'ARS' as const,
        }
      : null;
  const { data: ledgerBalance } = useAdminCourtesyCreditBalance(partnerQuery);

  const segments = groupSettlementAllocationsByRate(audit?.allocations ?? [], 'BARTER');
  const expected = summary.barterCreditExpectedCents;
  const materialized = summary.barterCreditMaterializedCents;
  const drift = expected != null && materialized != null && expected !== materialized;

  return (
    <section className="mt-8 rounded-lg border border-border p-4">
      <h3 className="font-medium text-text">BARTER — crédito de canje</h3>
      <p className="mt-1 text-sm text-text-muted">
        Cada uso en canje genera crédito = base × multiplicador del acuerdo vigente al asignar
        (snapshot). Crédito de canje ≠ dinero recibido.
      </p>

      {segments.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">Sin usos asignados a canje.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="px-2 py-2">Usos</th>
                <th className="px-2 py-2">Base</th>
                <th className="px-2 py-2">Multiplicador</th>
                <th className="px-2 py-2">Crédito generado</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((s) => (
                <tr key={`${s.agreementId}-${s.unitPriceCents}-${s.barterMultiplier}`} className="border-b border-border/60">
                  <td className="px-2 py-2">
                    {s.usageCount} × {formatBenefitMoneyCents(s.unitPriceCents)}
                  </td>
                  <td className="px-2 py-2">{formatBenefitMoneyCents(s.baseAmountCents)}</td>
                  <td className="px-2 py-2">{formatBarterMultiplierLabel(s.barterMultiplier)}</td>
                  <td className="px-2 py-2 font-medium">
                    {formatBenefitMoneyCents(s.creditMaterializedCents)}
                    {s.creditMaterializedCents !== s.creditExpectedCents ? (
                      <span className="ml-1 text-xs text-amber-400">
                        (esperado {formatBenefitMoneyCents(s.creditExpectedCents)})
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-lg bg-bg-muted p-3">
          <dt className="text-xs text-text-muted">Crédito generado (esta liquidación)</dt>
          <dd className="mt-1 text-lg font-semibold">
            {formatBenefitMoneyCents(materialized ?? expected ?? '0')}
          </dd>
        </div>
        <div className="rounded-lg bg-bg-muted p-3">
          <dt className="text-xs text-text-muted">Crédito consumido (partner, global)</dt>
          <dd className="mt-1 text-lg font-semibold">
            {formatSignedBenefitMoneyCents(ledgerBalance?.creditConsumedCents ?? '0')}
          </dd>
        </div>
        <div className="rounded-lg bg-bg-muted p-3">
          <dt className="text-xs text-text-muted">Saldo disponible (partner, global)</dt>
          <dd className="mt-1 text-lg font-semibold">
            {formatSignedBenefitMoneyCents(ledgerBalance?.balanceAvailableCents ?? '0')}
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-text-muted">
        Consumo y saldo son del partner (todas sus liquidaciones); no se atribuyen a esta
        liquidación ni a un descuento.
      </p>

      {drift ? (
        <p className="mt-3 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          Hay una diferencia de materialización de crédito. Revisar conciliación.
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <Link href={ledgerHref} className="text-accent hover:underline">
          Ver movimientos de crédito del partner →
        </Link>
        {settlement.vertical === 'GASTRO' && settlement.gastroProfileId ? (
          <Link
            href={`/admin/gastronomicos/${settlement.gastroProfileId}/cortesia`}
            className="text-accent hover:underline"
          >
            Crear cortesía con saldo →
          </Link>
        ) : settlement.vertical === 'ACTIVITY' ? (
          <span className="text-text-muted">Consumo de cortesías Activity: no disponible en V3.3.</span>
        ) : null}
      </div>
    </section>
  );
}
