'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { producersKeys } from '@/lib/query/keys';

type Props = {
  producerIdOrSlug: string;
  tenantId: string;
};

export function ProducerPublicCommentsSection({ producerIdOrSlug, tenantId }: Props) {
  const repos = useRepositories();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: [...producersKeys.detail(producerIdOrSlug), 'reviews', page],
    queryFn: () => repos.producers.listReviews(producerIdOrSlug, { page, limit: 8 }),
  });

  const reviews = data?.reviews ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 8);

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-text">Comentarios sobre sus eventos</h2>
      {isLoading ? (
        <p className="mt-4 text-sm text-text-muted">Cargando comentarios…</p>
      ) : reviews.length === 0 ? (
        <p className="mt-4 text-sm text-text-muted">
          Todavía no hay comentarios públicos sobre eventos de esta productora.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-border bg-bg-muted p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/events/${r.eventId}?tenantId=${encodeURIComponent(tenantId)}`}
                  className="font-medium text-accent hover:underline"
                >
                  {r.eventTitle}
                </Link>
                <span className="text-sm text-amber-400">★ {r.rating}</span>
              </div>
              {r.comment ? (
                <p className="mt-2 text-sm text-text-muted leading-relaxed">{r.comment}</p>
              ) : null}
              <p className="mt-2 text-xs text-text-muted">
                {r.userDisplayName} ·{' '}
                {new Date(r.createdAt).toLocaleDateString('es-AR')}
              </p>
            </li>
          ))}
        </ul>
      )}
      {totalPages > 1 ? (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border border-border px-3 py-1 text-sm disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-border px-3 py-1 text-sm disabled:opacity-40"
          >
            Ver más
          </button>
        </div>
      ) : null}
    </section>
  );
}
