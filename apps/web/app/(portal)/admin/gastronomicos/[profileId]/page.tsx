'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { adminGastroKeys } from '@/lib/query/keys';
import { PageContainer, SectionTitle } from '@/components';
import { AdminGastroDiscountsTable } from '@/components/admin/gastro/AdminGastroDiscountsTable';

export default function AdminGastroLocationDetailPage() {
  const params = useParams();
  const profileId = (params?.profileId as string) ?? '';
  const repos = useRepositories();

  const { data: location, isLoading: loadingLocation } = useQuery({
    queryKey: adminGastroKeys.detail(profileId),
    queryFn: () => repos.adminGastro.getLocation(profileId),
    enabled: !!profileId,
  });

  const { data: discountsData, isLoading: loadingDiscounts } = useQuery({
    queryKey: adminGastroKeys.discounts(profileId),
    queryFn: () => repos.adminGastro.listLocationDiscounts(profileId),
    enabled: !!profileId,
  });

  const PENDING = ['PENDING_REVIEW', 'COMMISSION_NEGOTIATION', 'APPROVED'] as const;
  const discounts = [...(discountsData?.data ?? [])].sort((a, b) => {
    const aPending = PENDING.includes(a.status as (typeof PENDING)[number]);
    const bPending = PENDING.includes(b.status as (typeof PENDING)[number]);
    if (aPending !== bPending) return aPending ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const pendingCount = discounts.filter((d) =>
    PENDING.includes(d.status as (typeof PENDING)[number]),
  ).length;

  return (
    <PageContainer>
      <Link
        href="/admin/gastronomicos"
        className="mb-4 inline-block text-sm text-text-muted hover:text-text"
      >
        ← Gastronómicos
      </Link>

      {loadingLocation ? (
        <p className="text-text-muted">Cargando…</p>
      ) : !location ? (
        <p className="text-text-muted">Local no encontrado</p>
      ) : (
        <>
          <SectionTitle>{location.displayName}</SectionTitle>
          <p className="mt-1 text-text-muted">
            {location.owner.email}
            {location.owner.name ? ` · ${location.owner.name}` : ''}
            {location.city ? ` · ${location.city}` : ''}
          </p>

          <div className="mt-6 grid gap-4 rounded-lg border border-border bg-bg-muted p-4 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="Teléfono" value={location.contactPhone} />
            <Info label="Email contacto" value={location.contactEmail} />
            <Info label="Ciudad" value={location.city} />
            <Info label="Tickets" value={String(location.discountsCount)} />
            <Info label="Pendientes" value={String(location.pendingDiscountsCount)} />
            <Info label="Activos" value={String(location.activeDiscountsCount)} />
            <Info
              label="Alta"
              value={new Date(location.createdAt).toLocaleDateString('es-AR')}
            />
            {location.summary && (
              <div className="sm:col-span-2 lg:col-span-3">
                <Info label="Resumen" value={location.summary} />
              </div>
            )}
          </div>

          <h2 className="mt-10 text-lg font-semibold text-text">Tickets de descuento</h2>
          {pendingCount > 0 && (
            <p className="mt-2 rounded-lg border border-accent/40 bg-accent/5 px-3 py-2 text-sm text-text">
              {pendingCount} ticket(s) pendiente(s) de revisión en este local.
            </p>
          )}
          <p className="mt-1 text-sm text-text-muted">
            Expandí una fila para ver métricas. Usá &quot;Revisar y publicar&quot; para curar
            imágenes y moderar.
          </p>

          {loadingDiscounts ? (
            <p className="mt-4 text-text-muted">Cargando tickets…</p>
          ) : (
            <div className="mt-4">
              <AdminGastroDiscountsTable profileId={profileId} discounts={discounts} />
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-0.5 text-sm text-text">{value?.trim() ? value : '—'}</p>
    </div>
  );
}
