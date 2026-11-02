'use client';

import {
  formatBenefitMoneyCents,
  type BenefitCommercialAgreementDiscountHistoryResponse,
  type BenefitCommercialAgreementDto,
} from '@yo-te-invito/shared';
import { Badge } from '@/components';
import {
  BENEFIT_AGREEMENT_SCOPE_LABEL,
  BENEFIT_AGREEMENT_VIGENCY_LABEL,
  benefitAgreementOriginLabel,
} from '@/lib/admin/benefit-agreement-labels';

function vigencyText(a: BenefitCommercialAgreementDto): string {
  return `${a.validFrom} → ${a.validTo ?? 'abierto'}`;
}

function Row({ agreement, extra }: { agreement: BenefitCommercialAgreementDto; extra?: string }) {
  const legacy = agreement.scope === 'PROFILE_LEGACY';
  return (
    <li className="rounded-lg border border-border bg-bg px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-text">
          {formatBenefitMoneyCents(agreement.unitPriceCents, agreement.currency)} / validación
        </span>
        <span className="text-text-muted">· canje ×{agreement.barterMultiplier}</span>
        <Badge>{BENEFIT_AGREEMENT_VIGENCY_LABEL[agreement.vigency]}</Badge>
        {legacy ? <Badge>Legacy · solo lectura</Badge> : null}
      </div>
      <p className="mt-1 text-xs text-text-muted">
        {vigencyText(agreement)} · {BENEFIT_AGREEMENT_SCOPE_LABEL[agreement.scope]} ·{' '}
        {benefitAgreementOriginLabel(agreement)}
        {extra ? ` · ${extra}` : ''}
      </p>
      {agreement.notes ? <p className="mt-1 text-xs text-text-muted">Notas: {agreement.notes}</p> : null}
    </li>
  );
}

/** G10.B — history of THIS discount's contracts + legacy local rows that priced its uses. */
export function AdminGastroDiscountAgreementHistory({
  data,
}: {
  data: BenefitCommercialAgreementDiscountHistoryResponse;
}) {
  return (
    <div className="mt-5 space-y-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Historial</h3>
        {data.history.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">Este descuento todavía no tuvo contratos.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {data.history.map((a) => (
              <Row key={a.id} agreement={a} />
            ))}
          </ul>
        )}
      </div>
      {data.legacyUsed.length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Contrato del local (legacy) · solo lectura
          </h3>
          <p className="mt-1 text-xs text-text-muted">
            Contratos del local anteriores a G10 que valuaron usos ya liquidados de este descuento.
            No se pueden editar, reemplazar ni cerrar, y no se usan para usos nuevos.
          </p>
          <ul className="mt-2 space-y-2">
            {data.legacyUsed.map(({ agreement, usageCount }) => (
              <Row key={agreement.id} agreement={agreement} extra={`${usageCount} uso(s) liquidados`} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
