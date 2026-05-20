'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { producerReviewsKeys } from '@/lib/query/keys';
import { SectionTitle } from '@/components';
import { ProducerReviewSummary } from './ProducerReviewSummary';
import { ProducerReviewCard } from './ProducerReviewCard';

const selectClass =
  'rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent';

export function ProducerCommentsPage() {
  const repos = useRepositories();
  const [eventId, setEventId] = useState('');
  const [rating, setRating] = useState('');
  const [disputeStatus, setDisputeStatus] = useState('ALL');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);

  const filtersKey = useMemo(
    () => JSON.stringify({ eventId, rating, disputeStatus, sort, page }),
    [eventId, rating, disputeStatus, sort, page],
  );

  const { data: summary } = useQuery({
    queryKey: producerReviewsKeys.summary(),
    queryFn: () => repos.producerReviews.getSummary(),
  });

  const { data, isLoading } = useQuery({
    queryKey: producerReviewsKeys.list(filtersKey),
    queryFn: () =>
      repos.producerReviews.listReviews({
        eventId: eventId || undefined,
        rating: rating ? Number(rating) : undefined,
        disputeStatus: disputeStatus === 'ALL' ? undefined : disputeStatus,
        sort,
        page,
        limit: 15,
      }),
  });

  const totalPages = data ? Math.ceil(data.total / 15) : 0;

  return (
    <section>
      <SectionTitle>Comentarios y valoraciones</SectionTitle>
      <p className="mt-1 max-w-2xl text-sm text-text-muted">
        Gestioná las valoraciones recibidas en tus eventos y solicitá revisión si considerás que alguna
        calificación no corresponde.
      </p>

      {summary ? <ProducerReviewSummary summary={summary} /> : null}

      <section className="mt-8 rounded-xl border border-border bg-bg-muted p-4">
        <h3 className="text-sm font-semibold text-text">Filtros</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-xs text-text-muted">
            Evento
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
          <label className="block text-xs text-text-muted">
            Puntaje
            <select
              className={`${selectClass} mt-1 w-full`}
              value={rating}
              onChange={(e) => {
                setRating(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={String(n)}>
                  {n} estrella{n === 1 ? '' : 's'}
                </option>
              ))}
            </select>
          </label>
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
        </div>
      </section>

      <section className="mt-8">
        {isLoading ? (
          <p className="text-sm text-text-muted">Cargando comentarios…</p>
        ) : !data?.reviews.length ? (
          <p className="text-sm text-text-muted">No hay valoraciones con estos filtros.</p>
        ) : (
          <ul className="space-y-4">
            {data.reviews.map((r) => (
              <li key={r.id}>
                <ProducerReviewCard review={r} filtersKey={filtersKey} />
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
