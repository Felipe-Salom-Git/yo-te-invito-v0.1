'use client';

import Link from 'next/link';
import { formatBenefitMoneyCents, type BenefitCommercialAgreementDto } from '@yo-te-invito/shared';
import { useAdminBenefitAgreementPartnerHistory } from '@/lib/query/benefit-agreements';
import { BENEFIT_AGREEMENT_VIGENCY_LABEL } from '@/lib/admin/benefit-agreement-labels';

type Props = {
  profileId: string;
  partnerDisplayName?: string | null;
};

function VigencyLine({ agreement }: { agreement: BenefitCommercialAgreementDto }) {
  const to = agreement.validTo ? ` → ${agreement.validTo}` : ' → abierto';
  return (
    <span>
      {agreement.validFrom}
      {to} · {BENEFIT_AGREEMENT_VIGENCY_LABEL[agreement.vigency]}
    </span>
  );
}

/**
 * Commercial context for discount approval — scoped to GastroProfile (partner), not the discount.
 */
export function AdminGastroDiscountCommercialContextPanel({
  profileId,
  partnerDisplayName,
}: Props) {
  const historyQuery = useAdminBenefitAgreementPartnerHistory({
    vertical: 'GASTRO',
    gastroProfileId: profileId,
  });

  const current = historyQuery.data?.current ?? null;
  const name =
    partnerDisplayName?.trim() ||
    historyQuery.data?.partnerDisplayName?.trim() ||
    'este local';

  return (
    <section className="mt-8 rounded-xl border border-border bg-bg-muted/40 p-4 sm:p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
        Acuerdo comercial del local
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        El acuerdo pertenece a <span className="font-medium text-text">{name}</span> (partner), no al
        descuento individual. Cambiar la tarifa afecta futuras allocations de todos los descuentos
        del local; las allocations históricas conservan su snapshot.
      </p>

      {historyQuery.isLoading ? (
        <p className="mt-4 text-sm text-text-muted">Cargando acuerdo vigente…</p>
      ) : historyQuery.isError ? (
        <p className="mt-4 text-sm text-red-600">No se pudo cargar el acuerdo comercial.</p>
      ) : current ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <dt className="text-text-muted">Valor por ticket</dt>
            <dd className="mt-0.5 font-medium text-text">
              {formatBenefitMoneyCents(current.unitPriceCents, current.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">Multiplicador de canje</dt>
            <dd className="mt-0.5 font-medium text-text">×{current.barterMultiplier}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Moneda</dt>
            <dd className="mt-0.5 font-medium text-text">{current.currency}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Vigencia</dt>
            <dd className="mt-0.5 font-medium text-text">
              <VigencyLine agreement={current} />
            </dd>
          </div>
        </dl>
      ) : (
        <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <p className="font-medium text-text">Sin acuerdo comercial vigente</p>
          <p className="mt-1 text-text-muted">
            Este local no tiene un <code className="text-xs">BenefitCommercialAgreement</code>{' '}
            aplicable hoy. Sin tarifa vigente no se pueden liquidar usos validados.
          </p>
        </div>
      )}

      <p className="mt-4 text-xs text-text-muted">
        Gestión completa:{' '}
        <Link
          href="/admin/liquidaciones/acuerdos"
          className="text-accent hover:underline"
        >
          Liquidaciones → Acuerdos
        </Link>
      </p>
    </section>
  );
}
