'use client';

import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { adminGastroKeys } from '@/lib/query/keys';
import { ECONOMIC_SUMMARY_COPY } from '@/lib/gastro/discount-economic-summary-ui';
import { DiscountEconomicSummaryView } from '@/components/gastro/economic-summary/DiscountEconomicSummaryView';

/**
 * G10.C4 — "Métricas económicas" of ONE discount (replaces the G6 panel).
 * Read-only: registering / reversing CASH and assigning usages arrive in G10.D.
 */
export function AdminGastroDiscountEconomicSummaryPanel({
  profileId,
  discountId,
}: {
  profileId: string;
  discountId: string;
}) {
  const repos = useRepositories();
  const query = useQuery({
    queryKey: adminGastroKeys.economicSummary(profileId, discountId),
    queryFn: () => repos.adminGastro.getDiscountEconomicSummary(profileId, discountId),
    enabled: !!profileId && !!discountId,
  });

  if (query.isLoading) {
    return <p className="mt-8 text-sm text-text-muted">Cargando métricas económicas…</p>;
  }
  if (query.isError || !query.data) {
    return (
      <p className="mt-8 text-sm text-text-muted">
        No se pudieron cargar las métricas económicas de este descuento.
      </p>
    );
  }

  return (
    <DiscountEconomicSummaryView
      summary={query.data}
      title={ECONOMIC_SUMMARY_COPY.adminTitle}
      missingContractAction={
        <a href="#contrato-comercial" className="text-sm font-medium text-accent hover:underline">
          Cargar contrato del descuento
        </a>
      }
      settlementHref={(settlementId) => `/admin/liquidaciones/${encodeURIComponent(settlementId)}`}
    />
  );
}
