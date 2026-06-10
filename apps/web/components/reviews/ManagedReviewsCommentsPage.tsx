'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type {
  ProducerManagedReviewListItem,
  ProducerReviewDisputeFilter,
  ProducerReviewReplyFilter,
  ReviewPublicStatus,
} from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { SectionTitle, PageLoader, QueryError, EmptyState } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import {
  formatPublicRatingLabel,
  internalTenToVisualStars,
  PUBLIC_RATING_STARS_MAX,
  publicStarFilterLabel,
  visualStarsToInternalTen,
} from '@/lib/reviews/ratingDisplay';
import { ManagedReviewSummary } from '@/components/producer/comments/ManagedReviewSummary';
import { ProducerCommentsHelp } from '@/components/producer/comments/ProducerCommentsHelp';
import { ManagedReviewCard } from '@/components/producer/comments/ManagedReviewCard';
import {
  MANAGED_PORTAL_QUICK_FILTERS,
  PUBLIC_STATUS_FILTER_OPTIONS,
  quickFilterToListParams,
  type ManagedReviewsQuickFilter,
} from '@/lib/producer/managed-reviews-filters';
import {
  buildManagedReviewsSearchParams,
  parseManagedReviewsUrl,
} from '@/lib/producer/managed-reviews-url';
import {
  gastroReviewsKeys,
  hotelReviewsKeys,
  producerReviewsKeys,
} from '@/lib/query/keys';

export type ManagedReviewsScope = 'producer' | 'gastro' | 'hotel';

const COPY: Record<
  ManagedReviewsScope,
  { title: string; subtitle: string; eventLabel: string }
> = {
  producer: {
    title: 'Comentarios y valoraciones',
    subtitle:
      'Revisá la reputación de tus eventos, respondé en público y solicitá revisión a administración cuando corresponda.',
    eventLabel: 'Evento',
  },
  gastro: {
    title: 'Valoraciones de clientes',
    subtitle:
      'Respondé públicamente a las opiniones de tu establecimiento. No podés modificar el puntaje.',
    eventLabel: 'Establecimiento',
  },
  hotel: {
    title: 'Valoraciones de huéspedes',
    subtitle:
      'Respondé públicamente a las opiniones de tu alojamiento. No podés modificar el puntaje.',
    eventLabel: 'Alojamiento',
  },
};

const PRODUCER_QUICK_FILTERS: { id: ManagedReviewsQuickFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'unanswered', label: 'Sin responder' },
  { id: 'answered', label: 'Respondidos' },
  { id: 'open_dispute', label: 'Con disputa' },
  { id: 'highest', label: 'Mejores' },
  { id: 'lowest', label: 'Menores' },
];

const selectClass =
  'rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent';

const chipClass = (active: boolean) =>
  `shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
    active
      ? 'border-accent-muted bg-accent-surface text-accent-soft'
      : 'border-border text-text-muted hover:border-accent-muted hover:text-text'
  }`;

type Props = {
  scope: ManagedReviewsScope;
};

export function ManagedReviewsCommentsPage({ scope }: Props) {
  const repos = useRepositories();
  const copy = COPY[scope];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const quickFilterOptions =
    scope === 'producer' ? PRODUCER_QUICK_FILTERS : MANAGED_PORTAL_QUICK_FILTERS;

  const [quickFilter, setQuickFilter] = useState<ManagedReviewsQuickFilter>('all');
  const [eventId, setEventId] = useState('');
  const [overallRating, setOverallRating] = useState('');
  const [disputeStatus, setDisputeStatus] = useState<ProducerReviewDisputeFilter>('ALL');
  const [replyFilter, setReplyFilter] = useState<ProducerReviewReplyFilter>('ALL');
  const [publicStatus, setPublicStatus] = useState<'' | ReviewPublicStatus>('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [page, setPage] = useState(1);
  const [urlReady, setUrlReady] = useState(false);

  useEffect(() => {
    const parsed = parseManagedReviewsUrl(searchParams);
    if (parsed.quick) setQuickFilter(parsed.quick);
    if (parsed.eventId != null) setEventId(parsed.eventId);
    if (parsed.overallRating != null) setOverallRating(parsed.overallRating);
    if (parsed.disputeStatus) setDisputeStatus(parsed.disputeStatus);
    if (parsed.replyFilter) setReplyFilter(parsed.replyFilter);
    if (parsed.publicStatus != null) setPublicStatus(parsed.publicStatus);
    if (parsed.sort) setSort(parsed.sort);
    if (parsed.page) setPage(parsed.page);
    setUrlReady(true);
  }, [searchParams]);

  useEffect(() => {
    if (!urlReady) return;
    const built = buildManagedReviewsSearchParams({
      quick: quickFilter,
      eventId,
      overallRating,
      disputeStatus,
      replyFilter,
      publicStatus,
      sort,
      page,
    });
    const next = built.toString();
    const current = searchParams.toString();
    if (next !== current) {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }
  }, [
    urlReady,
    quickFilter,
    eventId,
    overallRating,
    disputeStatus,
    replyFilter,
    publicStatus,
    sort,
    page,
    pathname,
    router,
    searchParams,
  ]);

  const quickParams = quickFilterToListParams(quickFilter);

  const filtersKey = useMemo(
    () =>
      JSON.stringify({
        scope,
        quickFilter,
        eventId,
        overallRating,
        disputeStatus,
        replyFilter,
        publicStatus,
        sort,
        page,
      }),
    [
      scope,
      quickFilter,
      eventId,
      overallRating,
      disputeStatus,
      replyFilter,
      publicStatus,
      sort,
      page,
    ],
  );

  const listParams = {
    eventId: eventId || undefined,
    overallRating: overallRating ? Number(overallRating) : undefined,
    disputeStatus:
      scope === 'producer'
        ? quickParams.disputeStatus ?? (disputeStatus !== 'ALL' ? disputeStatus : undefined)
        : undefined,
    replyFilter:
      quickParams.replyFilter ?? (replyFilter !== 'ALL' ? replyFilter : undefined),
    publicStatus: scope === 'producer' && publicStatus ? publicStatus : undefined,
    sort: quickParams.sort ?? sort,
    page,
    limit: 15,
  };

  const summaryKey =
    scope === 'producer'
      ? producerReviewsKeys.summary()
      : scope === 'gastro'
        ? gastroReviewsKeys.summary()
        : hotelReviewsKeys.summary();

  const summaryQuery = useQuery({
    queryKey: summaryKey,
    queryFn: () =>
      scope === 'producer'
        ? repos.producerReviews.getSummary()
        : scope === 'gastro'
          ? repos.gastroReviews.getSummary()
          : repos.hotelReviews.getSummary(),
  });

  const listQueryKey =
    scope === 'producer'
      ? producerReviewsKeys.list(filtersKey)
      : scope === 'gastro'
        ? gastroReviewsKeys.list(filtersKey)
        : hotelReviewsKeys.list(filtersKey);

  const listQuery = useQuery({
    queryKey: listQueryKey,
    queryFn: () =>
      scope === 'producer'
        ? repos.producerReviews.listReviews(listParams)
        : scope === 'gastro'
          ? repos.gastroReviews.listReviews(listParams)
          : repos.hotelReviews.listReviews(listParams),
  });

  const replyFn =
    scope === 'producer'
      ? repos.producerReviews.reply.bind(repos.producerReviews)
      : scope === 'gastro'
        ? repos.gastroReviews.reply.bind(repos.gastroReviews)
        : repos.hotelReviews.reply.bind(repos.hotelReviews);

  const replyAuthorLabel =
    scope === 'producer'
      ? 'Tu productora'
      : scope === 'gastro'
        ? 'Tu establecimiento'
        : 'Tu hotel';

  const data = listQuery.data;
  const totalPages = data ? Math.ceil(data.total / 15) : 0;
  const showEventFilter = scope === 'producer' && (data?.events.length ?? 0) > 1;

  const resetFilters = () => {
    setQuickFilter('all');
    setEventId('');
    setOverallRating('');
    setDisputeStatus('ALL');
    setReplyFilter('ALL');
    setPublicStatus('');
    setSort('newest');
    setPage(1);
  };

  const hasActiveFilters =
    quickFilter !== 'all' ||
    Boolean(eventId) ||
    Boolean(overallRating) ||
    disputeStatus !== 'ALL' ||
    replyFilter !== 'ALL' ||
    Boolean(publicStatus) ||
    sort !== 'newest';

  return (
    <section>
      <SectionTitle>{copy.title}</SectionTitle>
      <p className="mt-1 max-w-2xl text-sm text-text-muted">{copy.subtitle}</p>

      {summaryQuery.isLoading ? (
        <p className="mt-6 text-sm text-text-muted">Cargando resumen…</p>
      ) : summaryQuery.isError ? (
        <QueryError
          className="mt-6"
          message={getErrorMessage(summaryQuery.error)}
          onRetry={() => void summaryQuery.refetch()}
        />
      ) : summaryQuery.data ? (
        <div className="mt-6">
          <ManagedReviewSummary summary={summaryQuery.data} scope={scope} />
        </div>
      ) : null}

      {scope === 'producer' ? (
        <div className="mt-6">
          <ProducerCommentsHelp />
        </div>
      ) : null}

      <section className="mt-8 rounded-xl border border-border bg-bg-muted p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-text">Filtros</h3>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-accent hover:underline"
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>

        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
            {quickFilterOptions.map((f) => (
              <button
                key={f.id}
                type="button"
                className={chipClass(quickFilter === f.id)}
                onClick={() => {
                  setQuickFilter(f.id);
                  setPage(1);
                }}
              >
                {f.label}
              </button>
            ))}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {showEventFilter ? (
            <label className="block text-xs text-text-muted">
              {copy.eventLabel}
              <select
                className={`${selectClass} mt-1 w-full`}
                value={eventId}
                onChange={(e) => {
                  setEventId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todos los eventos</option>
                {(data?.events ?? []).map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="block text-xs text-text-muted">
            Puntaje ({PUBLIC_RATING_STARS_MAX} estrellas)
            <select
              className={`${selectClass} mt-1 w-full`}
              value={
                overallRating
                  ? String(internalTenToVisualStars(Number(overallRating)))
                  : ''
              }
              onChange={(e) => {
                setOverallRating(
                  e.target.value ? String(visualStarsToInternalTen(Number(e.target.value))) : '',
                );
                setPage(1);
              }}
            >
              <option value="">Cualquiera</option>
              {Array.from({ length: PUBLIC_RATING_STARS_MAX }, (_, i) => PUBLIC_RATING_STARS_MAX - i).map(
                (stars) => (
                  <option key={stars} value={String(stars)}>
                    {publicStarFilterLabel(stars)} ({formatPublicRatingLabel(visualStarsToInternalTen(stars))})
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="block text-xs text-text-muted">
            Orden
            <select
              className={`${selectClass} mt-1 w-full`}
              value={quickParams.sort ?? sort}
              onChange={(e) => {
                setSort(e.target.value as typeof sort);
                setQuickFilter('all');
                setPage(1);
              }}
            >
              <option value="newest">Más recientes</option>
              <option value="oldest">Más antiguas</option>
              <option value="highest">Mayor puntaje</option>
              <option value="lowest">Menor puntaje</option>
            </select>
          </label>

          <label className="block text-xs text-text-muted">
            Respuesta
            <select
              className={`${selectClass} mt-1 w-full`}
              value={quickParams.replyFilter ?? replyFilter}
              onChange={(e) => {
                setReplyFilter(e.target.value as ProducerReviewReplyFilter);
                setQuickFilter('all');
                setPage(1);
              }}
              disabled={quickFilter === 'unanswered' || quickFilter === 'answered'}
            >
              <option value="ALL">Todas</option>
              <option value="UNANSWERED">Sin responder</option>
              <option value="ANSWERED">Respondidas</option>
            </select>
          </label>

          {scope === 'producer' ? (
            <>
              <label className="block text-xs text-text-muted">
                Disputa
                <select
                  className={`${selectClass} mt-1 w-full`}
                  value={quickParams.disputeStatus ?? disputeStatus}
                  onChange={(e) => {
                    setDisputeStatus(e.target.value as ProducerReviewDisputeFilter);
                    setQuickFilter('all');
                    setPage(1);
                  }}
                  disabled={quickFilter === 'open_dispute'}
                >
                  <option value="ALL">Todas</option>
                  <option value="NONE">Sin solicitud</option>
                  <option value="OPEN">Abiertas</option>
                  <option value="PENDING">Pendiente</option>
                  <option value="IN_REVIEW">En revisión</option>
                  <option value="RESOLVED">Resuelta</option>
                  <option value="ACCEPTED">Aceptada</option>
                  <option value="REJECTED">Rechazada</option>
                </select>
              </label>

              <label className="block text-xs text-text-muted">
                Estado público
                <select
                  className={`${selectClass} mt-1 w-full`}
                  value={publicStatus}
                  onChange={(e) => {
                    setPublicStatus(e.target.value as '' | ReviewPublicStatus);
                    setPage(1);
                  }}
                >
                  {PUBLIC_STATUS_FILTER_OPTIONS.map((o) => (
                    <option key={o.value || 'any'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
        </div>
      </section>

      <section className="mt-8">
        {listQuery.isLoading ? (
          <PageLoader message="Cargando comentarios…" />
        ) : listQuery.isError ? (
          <QueryError
            message={getErrorMessage(listQuery.error)}
            onRetry={() => void listQuery.refetch()}
          />
        ) : !data?.reviews.length ? (
          scope === 'producer' &&
          !hasActiveFilters &&
          (summaryQuery.data?.totalReviews ?? 0) === 0 ? (
            <EmptyState
              title="Todavía no hay comentarios"
              description="Cuando tus eventos reciban valoraciones, las vas a ver acá para responder o solicitar revisión."
            />
          ) : (
            <EmptyState
              title="Sin resultados"
              description="No hay valoraciones con estos filtros. Probá ampliar la búsqueda."
            />
          )
        ) : (
          <ul className="space-y-4">
            {data.reviews.map((r: ProducerManagedReviewListItem) => (
              <li key={r.id}>
                <ManagedReviewCard
                  review={r}
                  scope={scope}
                  allowDisputes={scope === 'producer'}
                  replyFn={replyFn}
                  invalidateQueryKey={listQueryKey}
                  summaryQueryKey={summaryKey}
                  filtersKey={filtersKey}
                  replyAuthorLabel={replyAuthorLabel}
                />
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 ? (
          <footer className="mt-6 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded border border-border px-3 py-2 text-sm disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-sm text-text-muted">
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-border px-3 py-2 text-sm disabled:opacity-40"
            >
              Siguiente
            </button>
          </footer>
        ) : null}
      </section>
    </section>
  );
}
