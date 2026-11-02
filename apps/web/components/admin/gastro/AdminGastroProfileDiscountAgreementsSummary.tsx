'use client';

import Link from 'next/link';
import { formatBenefitMoneyCents } from '@yo-te-invito/shared';
import { useAdminBenefitAgreementsList } from '@/lib/query/benefit-agreements';
import { AdminGastroDiscountAgreementPanel } from './AdminGastroDiscountAgreementPanel';

type Props = { profileId: string; fromDiscountId?: string | null };

/**
 * G10.B — read-only commercial context of a settlement: contracts are per discount. Started from a
 * discount → that discount's contract; otherwise the CURRENT contracts of the local's discounts.
 */
export function AdminGastroProfileDiscountAgreementsSummary({ profileId, fromDiscountId }: Props) {
  const listQuery = useAdminBenefitAgreementsList(
    { vertical: 'GASTRO', gastroProfileId: profileId, scope: 'DISCOUNT', vigency: 'CURRENT' },
    !fromDiscountId,
  );
  if (fromDiscountId) {
    return <AdminGastroDiscountAgreementPanel profileId={profileId} discountId={fromDiscountId} allowManage={false} />;
  }
  const rows = listQuery.data?.data ?? [];
  return (
    <section className="mt-6 rounded-xl border border-border bg-bg-muted/40 p-4">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
        Contratos vigentes de los descuentos del local
      </h4>
      <p className="mt-1 text-xs text-text-muted">
        Cada uso se valúa con el contrato de su propio descuento. Los descuentos sin contrato vigente
        quedan pendientes sin precio.
      </p>
      {listQuery.isLoading ? (
        <p className="mt-3 text-sm text-text-muted">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
          Ningún descuento de este local tiene contrato comercial vigente.
        </p>
      ) : (
        <ul className="mt-3 space-y-1 text-sm">
          {rows.map((a) => (
            <li key={a.id} className="text-text">
              {a.discountTitle ?? 'Sin título'} · {formatBenefitMoneyCents(a.unitPriceCents, a.currency)} / validación ·
              canje ×{a.barterMultiplier}
            </li>
          ))}
        </ul>
      )}
      <Link
        href={`/admin/liquidaciones/acuerdos?vertical=GASTRO&gastroProfileId=${encodeURIComponent(profileId)}`}
        className="mt-3 inline-block text-xs text-accent hover:underline"
      >
        Ver todos los contratos del local
      </Link>
    </section>
  );
}
