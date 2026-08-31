'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  classifyGastroDiscountLifecycle,
  type GastroDiscountLifecycleBucket,
} from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { adminGastroKeys } from '@/lib/query/keys';
import { PageContainer, SectionTitle } from '@/components';
import { AdminGastroDiscountsTable } from '@/components/admin/gastro/AdminGastroDiscountsTable';
import { AdminGastroHardDeleteActions } from '@/components/admin/gastro/AdminGastroHardDeleteActions';

const TABS: Array<{ id: GastroDiscountLifecycleBucket; label: string }> = [
  { id: 'ACTIVE', label: 'Activos' },
  { id: 'PENDING', label: 'Pendientes' },
  { id: 'FINISHED', label: 'Vencidos / finalizados' },
  { id: 'ARCHIVED', label: 'Archivados' },
];

export default function AdminGastroLocationDetailPage() {
  const params = useParams();
  const profileId = (params?.profileId as string) ?? '';
  const repos = useRepositories();
  const [tabOverride, setTabOverride] = useState<GastroDiscountLifecycleBucket | null>(null);

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

  const grouped = useMemo(() => {
    const buckets: Record<GastroDiscountLifecycleBucket, NonNullable<typeof discountsData>['data']> =
      {
        ACTIVE: [],
        PENDING: [],
        FINISHED: [],
        ARCHIVED: [],
      };
    for (const d of discountsData?.data ?? []) {
      const bucket = classifyGastroDiscountLifecycle({
        status: d.status,
        archivedAt: d.archivedAt,
        validityMode: d.validityMode,
        validTo: d.validTo,
        discountDate: d.discountDate,
        hasPendingUpdate: Boolean(d.hasPendingUpdate),
      });
      buckets[bucket].push(d);
    }
    return buckets;
  }, [discountsData]);

  const pendingCount = grouped.PENDING.length;
  const tab: GastroDiscountLifecycleBucket =
    tabOverride ?? (pendingCount > 0 ? 'PENDING' : 'ACTIVE');
  const visible = grouped[tab];

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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <SectionTitle>{location.displayName}</SectionTitle>
              <p className="mt-1 text-text-muted">
                {location.owner.email ?? 'Sin dueño (admin)'}
                {location.owner.name ? ` · ${location.owner.name}` : ''}
                {location.city ? ` · ${location.city}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link
                href={`/admin/gastronomicos/${profileId}/editar`}
                className="rounded border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent/10"
              >
                Editar local
              </Link>
              {location.status === 'active' && location.publicEventId ? (
                <Link
                  href={`/gastronomicos/${profileId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded border border-border px-3 py-1.5 text-sm text-text-muted hover:border-accent hover:text-accent"
                >
                  Ver ficha pública
                </Link>
              ) : null}
              <AdminGastroHardDeleteActions
                profileId={profileId}
                displayName={location.displayName}
              />
            </div>
          </div>

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

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-text">Tickets de descuento</h2>
            {location.status === 'active' && (
              <Link
                href={`/admin/gastronomicos/${profileId}/descuentos/nuevo`}
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:bg-accent-hover"
              >
                Crear descuento
              </Link>
            )}
          </div>
          {pendingCount > 0 && (
            <p className="mt-2 rounded-lg border border-accent/40 bg-accent/5 px-3 py-2 text-sm text-text">
              {pendingCount} ticket(s) pendiente(s) de revisión en este local.
            </p>
          )}
          <p className="mt-1 text-sm text-text-muted">
            Expandí una fila para ver métricas. Usá &quot;Revisar y publicar&quot; para curar
            imágenes y moderar.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTabOverride(t.id)}
                className={`rounded-full px-3 py-1 text-sm ${
                  tab === t.id
                    ? 'bg-accent text-bg'
                    : 'border border-border text-text-muted hover:border-accent/50'
                }`}
              >
                {t.label} ({grouped[t.id].length})
              </button>
            ))}
          </div>

          {loadingDiscounts ? (
            <p className="mt-4 text-text-muted">Cargando tickets…</p>
          ) : (
            <div className="mt-4">
              <AdminGastroDiscountsTable profileId={profileId} discounts={visible} />
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
