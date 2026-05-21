'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ProducerManagedReviewListItem } from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { SectionTitle } from '@/components';
import { ProducerReviewSummary } from '@/components/producer/comments/ProducerReviewSummary';
import { ManagedReviewCard } from '@/components/producer/comments/ManagedReviewCard';
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
      'Gestioná las valoraciones recibidas en tus eventos y solicitá revisión si considerás que alguna calificación no corresponde.',
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

const selectClass =
  'rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent';

type Props = {
  scope: ManagedReviewsScope;
};

export function ManagedReviewsCommentsPage({ scope }: Props) {
  const repos = useRepositories();
  const copy = COPY[scope];
  const [eventId, setEventId] = useState('');
  const [overallRating, setOverallRating] = useState('');
  const [disputeStatus, setDisputeStatus] = useState('ALL');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);

  const filtersKey = useMemo(
    () => JSON.stringify({ scope, eventId, overallRating, disputeStatus, sort, page }),
    [scope, eventId, overallRating, disputeStatus, sort, page],
  );

  const listParams = {
    eventId: eventId || undefined,
    overallRating: overallRating ? Number(overallRating) : undefined,
    disputeStatus: scope === 'producer' && disputeStatus !== 'ALL' ? disputeStatus : undefined,
    sort,
    page,
    limit: 15,
  };

  const summaryQuery = useQuery({
    queryKey:
      scope === 'producer'
        ? producerReviewsKeys.summary()
        : scope === 'gastro'
          ? gastroReviewsKeys.summary()
          : hotelReviewsKeys.summary(),
    queryFn: () =>
      scope === 'producer'
        ? repos.producerReviews.getSummary()
        : scope === 'gastro'
          ? repos.gastroReviews.getSummary()
          : repos.hotelReviews.getSummary(),
  });

  const listQuery = useQuery({
    queryKey:
      scope === 'producer'
        ? producerReviewsKeys.list(filtersKey)
        : scope === 'gastro'
          ? gastroReviewsKeys.list(filtersKey)
          : hotelReviewsKeys.list(filtersKey),
    queryFn: () =>
      scope === 'producer'
        ? repos.producerReviews.listReviews(listParams)
        : scope === 'gastro'
          ? repos.gastroReviews.listReviews(listParams)
          : repos.hotelReviews.listReviews(listParams),
  });

  const invalidateQueryKey =
    scope === 'producer'
      ? producerReviewsKeys.list(filtersKey)
      : scope === 'gastro'
        ? gastroReviewsKeys.list(filtersKey)
        : hotelReviewsKeys.list(filtersKey);

  const replyFn =
    scope === 'producer'
      ? repos.producerReviews.reply.bind(repos.producerReviews)
      : scope === 'gastro'
        ? repos.gastroReviews.reply.bind(repos.gastroReviews)
        : repos.hotelReviews.reply.bind(repos.hotelReviews);

  const data = listQuery.data;
  const totalPages = data ? Math.ceil(data.total / 15) : 0;
  const showEventFilter = scope !== 'gastro' && (data?.events.length ?? 0) > 1;

  return (
    <section>
      <SectionTitle>{copy.title}</SectionTitle>
      <p className="mt-1 max-w-2xl text-sm text-text-muted">{copy.subtitle}</p>

      {summaryQuery.data ? <ProducerReviewSummary summary={summaryQuery.data} /> : null}

      <section className="mt-8 rounded-xl border border-border bg-bg-muted p-4">
        <h3 className="text-sm font-semibold text-text">Filtros</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                <option value="">Todos</option>
                {(data?.events ?? []).map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block text-xs text-text-muted">
            Puntaje (1–10)
            <select
              className={`${selectClass} mt-1 w-full`}
              value={overallRating}
              onChange={(e) => {
                setOverallRating(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={String(n)}>
                  {n}/10
                </option>
              ))}
            </select>
          </label>
          {scope === 'producer' ? (
            <>
              <label className="block text-xs text-text-muted">
                Estado
                <select
                  className={`${selectClass} mt-1 w-full`}
                  value={disputeStatus}
                  onChange={(e) => {
                    setDisputeStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="ALL">Todas</option>
                  <option value="NONE">Sin solicitud</option>
                  <option value="PENDING">Solicitud pendiente</option>
                  <option value="IN_REVIEW">En revisión</option>
                  <option value="RESOLVED">Resuelta</option>
                  <option value="ACCEPTED">Aceptada</option>
                  <option value="REJECTED">Rechazada</option>
                </select>
              </label>
              <label className="block text-xs text-text-muted">
                Fecha
                <select
                  className={`${selectClass} mt-1 w-full`}
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value as 'newest' | 'oldest');
                    setPage(1);
                  }}
                >
                  <option value="newest">Más recientes</option>
                  <option value="oldest">Más antiguas</option>
                </select>
              </label>
            </>
          ) : (
            <label className="block text-xs text-text-muted">
              Fecha
              <select
                className={`${selectClass} mt-1 w-full`}
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as 'newest' | 'oldest');
                  setPage(1);
                }}
              >
                <option value="newest">Más recientes</option>
                <option value="oldest">Más antiguas</option>
              </select>
            </label>
          )}
        </div>
      </section>

      <section className="mt-8">
        {listQuery.isLoading ? (
          <p className="text-sm text-text-muted">Cargando comentarios…</p>
        ) : !data?.reviews.length ? (
          <p className="text-sm text-text-muted">No hay valoraciones con estos filtros.</p>
        ) : (
          <ul className="space-y-4">
            {data.reviews.map((r: ProducerManagedReviewListItem) => (
              <li key={r.id}>
                <ManagedReviewCard
                  review={r}
                  scope={scope}
                  allowDisputes={scope === 'producer'}
                  replyFn={replyFn}
                  invalidateQueryKey={invalidateQueryKey}
                  filtersKey={filtersKey}
                />
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 ? (
          <footer className="mt-6 flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded border border-border px-3 py-1 text-sm disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="self-center text-sm text-text-muted">
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-border px-3 py-1 text-sm disabled:opacity-40"
            >
              Siguiente
            </button>
          </footer>
        ) : null}
      </section>
    </section>
  );
}
