'use client';

import Link from 'next/link';
import { formatBenefitMoneyCents } from '@yo-te-invito/shared';
import { Badge } from '@/components';
import { useAdminBenefitAgreementDiscountHistory } from '@/lib/query/benefit-agreements';
import { benefitAgreementOriginLabel } from '@/lib/admin/benefit-agreement-labels';
import {
  DISCOUNT_AGREEMENT_STATE_LABEL,
  resolveDiscountAgreementState,
  shouldWarnMissingDiscountAgreement,
} from '@/lib/admin/discount-agreement-status';
import { AdminGastroDiscountAgreementActions } from './AdminGastroDiscountAgreementActions';
import { AdminGastroDiscountAgreementHistory } from './AdminGastroDiscountAgreementHistory';

type Props = {
  profileId: string;
  discountId: string;
  /** false = read-only (e.g. settlement context). */
  allowManage?: boolean;
};

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-text">{value}</dd>
    </div>
  );
}

/**
 * G10.B — "Contrato comercial" of ONE discount (official flow: Local → Descuento → Contrato).
 * The contract of another discount (or the local's legacy row) never applies here.
 */
export function AdminGastroDiscountAgreementPanel({ profileId, discountId, allowManage = true }: Props) {
  const query = useAdminBenefitAgreementDiscountHistory(discountId);
  const data = query.data;
  const state = data ? resolveDiscountAgreementState(data) : null;
  const current = data?.current ?? null;

  return (
    <section
      id="contrato-comercial"
      className="mt-8 rounded-xl border border-border bg-bg-muted/40 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          Contrato comercial
        </h2>
        {state ? <Badge>{DISCOUNT_AGREEMENT_STATE_LABEL[state]}</Badge> : null}
      </div>
      <p className="mt-1 text-sm text-text-muted">
        Contrato de este descuento: define el valor que se liquida por cada validación y el
        multiplicador de canje. No lo comparte con otros descuentos del local.
      </p>

      {query.isLoading ? (
        <p className="mt-4 text-sm text-text-muted">Cargando contrato…</p>
      ) : query.isError || !data || !state ? (
        <p className="mt-4 text-sm text-red-600">No se pudo cargar el contrato comercial.</p>
      ) : (
        <>
          {state === 'NOT_BILLABLE' ? (
            <p className="mt-4 rounded-lg border border-border bg-bg p-3 text-sm text-text-muted">
              Cortesía financiada con canje: sus usos no son facturables y no requiere contrato
              comercial.
            </p>
          ) : null}

          {shouldWarnMissingDiscountAgreement(data) ? (
            <div role="alert" className="mt-4 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
              <p className="font-medium text-text">⚠ Sin contrato comercial vigente</p>
              <p className="mt-1 text-text-muted">
                Las validaciones de este descuento no pueden liquidarse hasta cargar un contrato.
              </p>
            </div>
          ) : null}

          {current ? (
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <Term
                label="Valor por validación"
                value={formatBenefitMoneyCents(current.unitPriceCents, current.currency)}
              />
              <Term label="Moneda" value={current.currency} />
              <Term label="Multiplicador de canje" value={`×${current.barterMultiplier}`} />
              <Term label="Vigencia" value={`${current.validFrom} → ${current.validTo ?? 'sin fecha de fin'}`} />
              <Term label="Origen" value={benefitAgreementOriginLabel(current)} />
            </dl>
          ) : null}

          {allowManage && data.billable ? (
            <AdminGastroDiscountAgreementActions
              profileId={profileId}
              discountId={discountId}
              current={current}
              history={data.history}
            />
          ) : null}

          <AdminGastroDiscountAgreementHistory data={data} />
        </>
      )}

      <p className="mt-4 text-xs text-text-muted">
        Todos los contratos:{' '}
        <Link
          href={`/admin/liquidaciones/acuerdos?vertical=GASTRO&gastroProfileId=${encodeURIComponent(profileId)}&gastroDiscountId=${encodeURIComponent(discountId)}`}
          className="text-accent hover:underline"
        >
          Liquidaciones → Acuerdos
        </Link>
      </p>
    </section>
  );
}
