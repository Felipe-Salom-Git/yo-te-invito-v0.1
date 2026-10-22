'use client';

import {
  formatBenefitMoneyCents,
  groupPendingValidationsByBenefit,
} from '@yo-te-invito/shared';
import { useAdminBenefitSettlementPendingValidations } from '@/lib/query/benefit-settlements';

type Props = {
  settlementId: string;
  /** Discount/coupon to list first (contextual entry). Grouping only. */
  focusBenefitId?: string | null;
};

/** G7.12.2 — eligible validations of this partner + period not yet allocated. */
export function SettlementPendingValidationsSection({ settlementId, focusBenefitId }: Props) {
  const { data, isLoading, isError } = useAdminBenefitSettlementPendingValidations(settlementId);

  if (isLoading) {
    return <p className="mt-8 text-sm text-text-muted">Cargando usos pendientes…</p>;
  }
  if (isError || !data) {
    return <p className="mt-8 text-sm text-red-500">No se pudieron cargar los usos pendientes.</p>;
  }

  const groups = groupPendingValidationsByBenefit(data.data, focusBenefitId);

  return (
    <section className="mt-8 rounded-lg border border-border p-4">
      <h3 className="font-medium text-text">Usos pendientes de asignar</h3>
      <p className="mt-1 text-sm text-text-muted">
        Validaciones del partner en el período sin asignación económica. El valor sale del acuerdo
        vigente a la fecha de cada validación.
      </p>
      {data.missingAgreementCount > 0 ? (
        <p className="mt-2 rounded border border-amber-500/40 bg-amber-500/10 p-2 text-sm">
          {data.missingAgreementCount} validación(es) sin acuerdo comercial aplicable — no se pueden
          asignar hasta cargar el acuerdo.
        </p>
      ) : null}
      {groups.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">No hay usos pendientes.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {groups.map((group) => (
            <div key={group.benefitId} className="overflow-x-auto">
              <h4 className="text-sm font-medium text-text">
                {group.benefitTitle}
                {group.benefitId === focusBenefitId ? (
                  <span className="ml-2 text-xs text-accent">(descuento de origen)</span>
                ) : null}
                <span className="ml-2 text-xs font-normal text-text-muted">
                  {group.items.length} uso(s) · {formatBenefitMoneyCents(group.baseAmountCents)}
                </span>
              </h4>
              <table className="mt-2 min-w-full text-left text-xs">
                <thead>
                  <tr className="text-text-muted">
                    <th className="px-1 py-1">Fecha</th>
                    <th className="px-1 py-1">Código</th>
                    <th className="px-1 py-1">Valor (acuerdo)</th>
                    <th className="px-1 py-1">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((v) => (
                    <tr key={v.validationId} className="border-t border-border/50">
                      <td className="px-1 py-1">
                        {new Date(v.validatedAt).toLocaleString('es-AR')}
                      </td>
                      <td className="px-1 py-1 font-mono">{v.shortCode ?? '—'}</td>
                      <td className="px-1 py-1">
                        {formatBenefitMoneyCents(v.unitPriceCents, v.currency)}
                      </td>
                      <td className="px-1 py-1 text-text-muted">Pendiente</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
