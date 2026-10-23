'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  classifyGastroDiscountLifecycle,
  isCourtesyOnlyVisibility,
  type GastroDiscountLifecycleBucket,
} from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle } from '@/components';
import { GastroLocationSelector } from '@/components/gastro/GastroLocationSelector';
import { GastroDiscountListItem } from '@/components/gastro/GastroDiscountListItem';
import { GastroCourtesyListItem } from '@/components/gastro/courtesy/GastroCourtesyListItem';
import { GastroCourtesyEmptyState } from '@/components/gastro/courtesy/GastroCourtesyEmptyState';
import { useGastroActiveLocation } from '@/lib/gastro/GastroActiveLocationContext';
import { gastroKeys } from '@/lib/query/keys';
import {
  matchesVisibilityFilter,
  resolveCourtesyScope,
  withCourtesyProfileQuery,
  type DiscountVisibilityFilter,
} from '@/lib/gastro/courtesy-scope';
import {
  discountTypeParam,
  parseDiscountTypeParam,
  resolveCourtesyEmptyState,
} from '@/lib/gastro/courtesy-portal';

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

export default function GastroDescuentosPage() {
  const repos = useRepositories();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { profileId, locations, isLoading: locationsLoading } = useGastroActiveLocation();
  const [tab, setTab] = useState<GastroDiscountLifecycleBucket>('ACTIVE');
  const visibilityFilter = parseDiscountTypeParam(searchParams.get('tipo'));
  const courtesyScope = resolveCourtesyScope(profileId, locations);

  const setVisibilityFilter = (filter: DiscountVisibilityFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    const value = discountTypeParam(filter);
    if (value) params.set('tipo', value);
    else params.delete('tipo');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  // G8.9.11: keyed by the selected local and only fired once it is resolved, so a switch
  // A → B never renders (nor reuses) A's cached list.
  const { data, isLoading } = useQuery({
    queryKey: gastroKeys.discounts(profileId),
    queryFn: () => repos.gastro.listMyDiscounts(profileId),
    enabled: !!profileId,
  });

  const allDiscounts = useMemo(
    () => (data?.data ?? []).filter((d) => !d.gastroProfileId || d.gastroProfileId === profileId),
    [data, profileId],
  );
  const discounts = useMemo(
    () => allDiscounts.filter((d) => matchesVisibilityFilter(d.visibility, visibilityFilter)),
    [allDiscounts, visibilityFilter],
  );
  const grouped = useMemo(() => {
    const buckets: Record<GastroDiscountLifecycleBucket, typeof discounts> = {
      ACTIVE: [],
      PENDING: [],
      FINISHED: [],
      ARCHIVED: [],
    };
    for (const d of discounts) {
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
  }, [discounts]);

  const visible = grouped[tab];
  const courtesyOnly = visibilityFilter === 'COURTESY_ONLY';
  const createCourtesyHref = withCourtesyProfileQuery('/gastro/descuentos/cortesia', profileId);
  const loading = locationsLoading || (!!profileId && isLoading);

  return (
    <PageContainer>
      <div className="mb-4">
        <GastroLocationSelector />
      </div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <SectionTitle>{courtesyOnly ? 'Cortesías del local' : 'Tickets de descuento'}</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {courtesyScope.ok ? (
            <Link
              href={createCourtesyHref}
              className="rounded-lg border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-accent/10"
            >
              Crear cortesía
            </Link>
          ) : null}
          <Link
            href={withCourtesyProfileQuery('/gastro/descuentos/nuevo', profileId)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-accent-hover"
          >
            Nuevo ticket
          </Link>
        </div>
      </div>
      <p className="mb-4 text-sm text-text-muted">
        {courtesyOnly
          ? 'Las cortesías son privadas y quedan pendientes de aprobación: los destinatarios reciben su QR recién cuando administración las aprueba.'
          : 'Los tickets se envían a revisión. Administración coordinará la comisión antes de activarlos.'}
      </p>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Tipo">
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
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
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
      {loading && <p className="text-text-muted">Cargando…</p>}
      {!loading && !profileId && (
        <p className="text-text-muted">Creá o seleccioná un local para ver sus tickets.</p>
      )}
      {!loading && profileId && visible.length === 0 && courtesyOnly ? (
        <GastroCourtesyEmptyState
          createHref={createCourtesyHref}
          state={resolveCourtesyEmptyState({
            bucket: tab,
            countsByBucket: {
              ACTIVE: grouped.ACTIVE.length,
              PENDING: grouped.PENDING.length,
              FINISHED: grouped.FINISHED.length,
              ARCHIVED: grouped.ARCHIVED.length,
            },
            canCreate: courtesyScope.ok,
          })}
        />
      ) : null}
      {!loading && profileId && visible.length === 0 && !courtesyOnly ? (
        <p className="text-text-muted">No hay tickets en esta sección.</p>
      ) : null}
      <ul className="space-y-3">
        {visible.map((d) => {
          const href = withCourtesyProfileQuery(`/gastro/descuentos/${d.id}`, profileId);
          return (
            <li key={d.id}>
              {isCourtesyOnlyVisibility(d.visibility) ? (
                <GastroCourtesyListItem item={d} href={href} />
              ) : (
                <GastroDiscountListItem item={d} href={href} />
              )}
            </li>
          );
        })}
      </ul>
    </PageContainer>
  );
}
