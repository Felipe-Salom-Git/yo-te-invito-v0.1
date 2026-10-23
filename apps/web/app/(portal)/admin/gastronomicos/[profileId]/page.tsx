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
import { Button, PageContainer, SectionTitle, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import {
  useAdminApproveGastroProfileMutation,
  useAdminGastroLocationMetrics,
  useAdminRejectGastroProfileMutation,
} from '@/lib/query/admin-gastro';
import { AdminGastroDiscountsTable } from '@/components/admin/gastro/AdminGastroDiscountsTable';
import { AdminGastroHardDeleteActions } from '@/components/admin/gastro/AdminGastroHardDeleteActions';
import { AdminGastroContentPanel } from '@/components/admin/gastro/AdminGastroContentPanel';
import { GastroProfileMetricsPanel } from '@/components/gastro/dashboard/GastroProfileMetricsPanel';
import {
  matchesVisibilityFilter,
  type DiscountVisibilityFilter,
} from '@/lib/gastro/courtesy-scope';

const VISIBILITY_FILTERS: Array<{ id: DiscountVisibilityFilter; label: string }> = [
  { id: 'ALL', label: 'Todos' },
  { id: 'PUBLIC', label: 'Descuentos' },
  { id: 'COURTESY_ONLY', label: 'Cortesías' },
];

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
  const { addToast } = useToast();
  const [tabOverride, setTabOverride] = useState<GastroDiscountLifecycleBucket | null>(null);
  const [visibilityFilter, setVisibilityFilter] = useState<DiscountVisibilityFilter>('ALL');
  const approveMutation = useAdminApproveGastroProfileMutation();
  const rejectMutation = useAdminRejectGastroProfileMutation();
  const moderationBusy = approveMutation.isPending || rejectMutation.isPending;

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

  const metricsQuery = useAdminGastroLocationMetrics(profileId, !!profileId);

  const grouped = useMemo(() => {
    const buckets: Record<GastroDiscountLifecycleBucket, NonNullable<typeof discountsData>['data']> =
      {
        ACTIVE: [],
        PENDING: [],
        FINISHED: [],
        ARCHIVED: [],
      };
    for (const d of discountsData?.data ?? []) {
      if (!matchesVisibilityFilter(d.visibility, visibilityFilter)) continue;
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
  }, [discountsData, visibilityFilter]);
  const courtesyCount = (discountsData?.data ?? []).filter(
    (d) => d.visibility === 'COURTESY_ONLY',
  ).length;

  const pendingCount = grouped.PENDING.length;
  const tab: GastroDiscountLifecycleBucket =
    tabOverride ?? (pendingCount > 0 ? 'PENDING' : 'ACTIVE');
  const visible = grouped[tab];

  const handleApprove = () => {
    if (!location) return;
    const ok = window.confirm(`¿Aprobar el local «${location.displayName}»?`);
    if (!ok) return;
    approveMutation.mutate(profileId, {
      onSuccess: () => addToast('Local gastronómico aprobado', 'success'),
      onError: (err) => addToast(getErrorMessage(err), 'error'),
    });
  };

  const handleReject = () => {
    if (!location) return;
    const reason = window.prompt('Motivo del rechazo (opcional):');
    if (reason === null) return;
    const ok = window.confirm(`¿Rechazar el local «${location.displayName}»?`);
    if (!ok) return;
    rejectMutation.mutate(
      { profileId, reason: reason.trim() || null },
      {
        onSuccess: () => addToast('Local gastronómico rechazado', 'success'),
        onError: (err) => addToast(getErrorMessage(err), 'error'),
      },
    );
  };

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
              <Link
                href={`/admin/gastronomicos/${profileId}/cortesia`}
                className="rounded border border-border px-3 py-1.5 text-sm text-text-muted hover:border-accent hover:text-accent"
              >
                Cortesía con canje
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

          {location.status === 'pending' ? (
            <div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
              <p className="font-medium text-text">
                Este local está esperando aprobación
              </p>
              <p className="mt-1 text-sm text-text-muted">
                Aprobar activa el perfil, las membresías y la sincronización pública.
                No uses el toggle genérico de activar/suspender para este estado.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={moderationBusy}
                  onClick={handleApprove}
                >
                  {approveMutation.isPending ? 'Aprobando…' : 'Aprobar local'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={moderationBusy}
                  onClick={handleReject}
                >
                  {rejectMutation.isPending ? 'Rechazando…' : 'Rechazar local'}
                </Button>
              </div>
            </div>
          ) : null}

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

          <div className="mt-6 grid gap-4 rounded-lg border border-border bg-bg-muted p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Subcategorías
              </p>
              {location.subcategories && location.subcategories.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {location.subcategories.map((s) => (
                    <li
                      key={s.id}
                      className="rounded-full border border-border px-3 py-1 text-sm text-text"
                    >
                      {s.isPrimary ? (
                        <span className="mr-1 text-[10px] font-bold uppercase text-accent">
                          Principal
                        </span>
                      ) : null}
                      {s.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-text">
                  {location.subcategoryName?.trim() || '—'}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Etiquetas
              </p>
              {location.tags && location.tags.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {location.tags.map((t) => (
                    <li
                      key={t.id}
                      className="rounded-full border border-border px-3 py-1 text-sm text-text-muted"
                    >
                      {t.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-text">—</p>
              )}
            </div>
          </div>

          {metricsQuery.isLoading ? (
            <p className="mt-8 text-sm text-text-muted">Cargando métricas del local…</p>
          ) : metricsQuery.data ? (
            <GastroProfileMetricsPanel metrics={metricsQuery.data} />
          ) : null}

          <AdminGastroContentPanel profileId={profileId} />

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-text">Descuentos y cortesías</h2>
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
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Tipo">
            {VISIBILITY_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setVisibilityFilter(f.id)}
                aria-pressed={visibilityFilter === f.id}
                className={`rounded-lg px-3 py-1 text-xs ${
                  visibilityFilter === f.id
                    ? 'bg-bg-muted text-text ring-1 ring-accent'
                    : 'border border-border text-text-muted hover:border-accent/50'
                }`}
              >
                {f.label}
                {f.id === 'COURTESY_ONLY' ? ` (${courtesyCount})` : ''}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
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
