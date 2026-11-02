'use client';

import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { gastroKeys } from '@/lib/query/keys';
import { ECONOMIC_SUMMARY_COPY } from '@/lib/gastro/discount-economic-summary-ui';
import { DiscountEconomicSummaryView } from './economic-summary/DiscountEconomicSummaryView';

/**
 * G10.C5 — "Contrato y liquidaciones" in the GASTRO portal. Read-only: the contract is managed by
 * Administración; the payload is already redacted (no notes, actors or proof URLs).
 */
export function GastroDiscountEconomicSummaryPanel({ discountId }: { discountId: string }) {
  const repos = useRepositories();
  const query = useQuery({
    queryKey: gastroKeys.discountEconomicSummary(discountId),
    queryFn: () => repos.gastro.getMyDiscountEconomicSummary(discountId),
    enabled: !!discountId,
  });

  if (query.isLoading) {
    return <p className="mt-8 text-sm text-text-muted">Cargando contrato y liquidaciones…</p>;
  }
  if (query.isError || !query.data) {
    return (
      <p className="mt-8 text-sm text-text-muted">
        No se pudo cargar el contrato y las liquidaciones de este descuento.
      </p>
    );
  }

  return <DiscountEconomicSummaryView summary={query.data} title={ECONOMIC_SUMMARY_COPY.gastroTitle} />;
}
