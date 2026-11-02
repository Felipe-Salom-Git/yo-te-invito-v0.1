'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, EmptyState, PageContainer, SectionTitle } from '@/components';
import { LiquidacionesSubnav } from '@/components/admin/liquidaciones/LiquidacionesSubnav';
import { BenefitAgreementsFilters } from '@/components/admin/agreements/BenefitAgreementsFilters';
import { BenefitAgreementsTable } from '@/components/admin/agreements/BenefitAgreementsTable';
import { useAdminBenefitAgreementsList } from '@/lib/query/benefit-agreements';
import { useAgreementPartnerCatalog } from '@/lib/admin/use-agreement-partner-catalog';
import { buildAgreementsListQuery, type AgreementListFilters } from '@/lib/admin/benefit-agreement-list';

function initialFilters(params: URLSearchParams | null): AgreementListFilters {
  const vertical = params?.get('vertical');
  return {
    vertical: vertical === 'GASTRO' || vertical === 'ACTIVITY' ? vertical : '',
    // `partnerId` kept for links created before G10.B.
    partnerId: params?.get('gastroProfileId') ?? params?.get('excursionOperatorId') ?? params?.get('partnerId') ?? '',
    gastroDiscountId: params?.get('gastroDiscountId') ?? '',
    vigency: 'ALL',
    scope: '',
  };
}

export default function AdminBenefitAgreementsPage() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<AgreementListFilters>(() => initialFilters(searchParams));
  const query = useMemo(() => buildAgreementsListQuery(filters), [filters]);
  const { data, isLoading, isError } = useAdminBenefitAgreementsList(query);
  const catalog = useAgreementPartnerCatalog(filters.vertical, filters.partnerId, 'benefit-agreements-list');
  const rows = data?.data ?? [];
  const newHref = `/admin/liquidaciones/acuerdos/nuevo${
    filters.vertical === 'GASTRO' && filters.partnerId
      ? `?gastroProfileId=${encodeURIComponent(filters.partnerId)}${
          filters.gastroDiscountId ? `&gastroDiscountId=${encodeURIComponent(filters.gastroDiscountId)}` : ''
        }`
      : ''
  }`;

  return (
    <PageContainer>
      <LiquidacionesSubnav />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionTitle>Acuerdos comerciales</SectionTitle>
          <p className="mt-2 max-w-2xl text-sm text-text-muted">
            Gastronómico: cada descuento tiene su propio contrato (valor por validación y
            multiplicador de canje). Los contratos del local previos a G10 quedan visibles como
            legacy, solo lectura. Activity: contrato por operador. Los términos económicos son
            inmutables: para cambiarlos se cierra o reemplaza el contrato.
          </p>
        </div>
        <Link href={newHref}>
          <Button>Nuevo contrato</Button>
        </Link>
      </div>

      <BenefitAgreementsFilters
        value={filters}
        onChange={setFilters}
        partnerOptions={catalog.partnerOptions}
        discountOptions={catalog.discountOptions}
      />

      {isLoading ? (
        <p className="mt-6 text-text-muted">Cargando…</p>
      ) : isError ? (
        <p className="mt-6 text-sm text-red-400">No se pudieron cargar los acuerdos.</p>
      ) : rows.length === 0 ? (
        <EmptyState
          className="mt-8"
          title={filters.gastroDiscountId ? 'Este descuento no tiene contratos' : 'Sin acuerdos'}
          description={
            filters.gastroDiscountId
              ? 'Creá el contrato del descuento o quitá el filtro.'
              : 'Creá un contrato para un descuento (Gastronómico) o un operador (Activity).'
          }
        />
      ) : (
        <>
          <BenefitAgreementsTable rows={rows} />
          {data && data.total > rows.length ? (
            <p className="mt-2 text-xs text-text-muted">
              Mostrando {rows.length} de {data.total}. Usá los filtros para acotar.
            </p>
          ) : null}
        </>
      )}
    </PageContainer>
  );
}
