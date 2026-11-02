'use client';

import Link from 'next/link';
import { formatBenefitMoneyCents, type BenefitCommercialAgreementDto } from '@yo-te-invito/shared';
import { Badge, Button } from '@/components';
import {
  useCloseAdminBenefitAgreement,
  useReplaceAdminBenefitAgreement,
} from '@/lib/query/benefit-agreements';
import {
  BENEFIT_AGREEMENT_SCOPE_LABEL,
  BENEFIT_AGREEMENT_VIGENCY_LABEL,
} from '@/lib/admin/benefit-agreement-labels';
import {
  GASTRO_DISCOUNT_STATUS_LABEL,
  discountAgreementManageHref,
  isAgreementRowReadOnly,
} from '@/lib/admin/benefit-agreement-list';

/** ACTIVITY keeps its pre-G10 quick actions (operator-scoped, unchanged). */
function OperatorActions({ row }: { row: BenefitCommercialAgreementDto }) {
  const closeMutation = useCloseAdminBenefitAgreement();
  const replaceMutation = useReplaceAdminBenefitAgreement();
  if (!row.isOpen) return null;
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        size="sm"
        disabled={closeMutation.isPending}
        onClick={() => {
          const validTo = window.prompt('Cerrar acuerdo — fecha fin (YYYY-MM-DD):');
          if (!validTo) return;
          closeMutation.mutate({ id: row.id, body: { validTo } });
        }}
      >
        Cerrar
      </Button>
      <Button
        variant="secondary"
        size="sm"
        disabled={replaceMutation.isPending}
        onClick={() => {
          const effectiveFrom = window.prompt('Reemplazar — vigencia nueva desde (YYYY-MM-DD):');
          const pesos = window.prompt('Nuevo precio por uso (pesos ARS, sin centavos):');
          const multiplier = window.prompt('Multiplicador canje (ej. 2):', '2');
          if (!effectiveFrom || !pesos || !multiplier) return;
          const unitPriceCents = (BigInt(pesos.replace(/\D/g, '') || '0') * BigInt(100)).toString();
          replaceMutation.mutate({
            id: row.id,
            body: { effectiveFrom, unitPriceCents, barterMultiplier: multiplier, currency: 'ARS' },
          });
        }}
      >
        Reemplazar tarifa
      </Button>
    </div>
  );
}

function RowActions({ row }: { row: BenefitCommercialAgreementDto }) {
  if (isAgreementRowReadOnly(row)) {
    return <span className="text-xs text-text-muted">Solo lectura</span>;
  }
  if (row.scope === 'OPERATOR') return <OperatorActions row={row} />;
  const href = discountAgreementManageHref(row);
  return href ? (
    <Link href={href} className="text-sm text-accent hover:underline">
      Gestionar en el descuento
    </Link>
  ) : null;
}

/** G10.B — one row per agreement; GASTRO rows are always read in the context of a discount. */
export function BenefitAgreementsTable({ rows }: { rows: BenefitCommercialAgreementDto[] }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-bg-muted text-xs uppercase tracking-wide text-text-muted">
          <tr>
            <th className="px-3 py-2">Local / operador</th>
            <th className="px-3 py-2">Descuento</th>
            <th className="px-3 py-2">Estado del descuento</th>
            <th className="px-3 py-2">Valor</th>
            <th className="px-3 py-2">Canje</th>
            <th className="px-3 py-2">Vigencia</th>
            <th className="px-3 py-2">Alcance</th>
            <th className="px-3 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const legacy = isAgreementRowReadOnly(row);
            return (
              <tr key={row.id} className="border-t border-border align-top">
                <td className="px-3 py-2 text-text">{row.partnerDisplayName ?? '—'}</td>
                <td className="px-3 py-2 text-text">
                  {row.scope === 'DISCOUNT' ? row.discountTitle ?? 'Sin título' : legacy ? 'Todos (contrato del local)' : '—'}
                </td>
                <td className="px-3 py-2 text-text-muted">
                  {row.discountStatus ? GASTRO_DISCOUNT_STATUS_LABEL[row.discountStatus] ?? row.discountStatus : '—'}
                </td>
                <td className="px-3 py-2 text-text">
                  {formatBenefitMoneyCents(row.unitPriceCents, row.currency)}
                  <span className="text-text-muted"> / uso</span>
                </td>
                <td className="px-3 py-2 text-text">×{row.barterMultiplier}</td>
                <td className="px-3 py-2 text-text-muted">
                  {row.validFrom} → {row.validTo ?? 'abierto'}
                  <div className="mt-1">
                    <Badge>{BENEFIT_AGREEMENT_VIGENCY_LABEL[row.vigency]}</Badge>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <Badge>{BENEFIT_AGREEMENT_SCOPE_LABEL[row.scope]}</Badge>
                    {legacy ? <Badge>Legacy</Badge> : null}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <RowActions row={row} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
