'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { producersKeys } from '@/lib/query/keys';
import { QueryError } from '@/components/ui/QueryError';
import { ReviewEmptyState } from '@/components/reviews/ReviewEmptyState';
import { ReviewListSkeleton } from '@/components/reviews/ReviewListSkeleton';
import { ReviewPagination } from '@/components/reviews/ReviewPagination';

const PAGE_SIZE = 8;

type Props = {
  producerIdOrSlug: string;
  tenantId: string;
};

export function ProducerPublicCommentsSection({ producerIdOrSlug, tenantId }: Props) {
  const repos = useRepositories();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...producersKeys.detail(producerIdOrSlug), 'reviews', page],
    queryFn: () => repos.producers.listReviews(producerIdOrSlug, { page, limit: PAGE_SIZE }),
  });

  const reviews = data?.reviews ?? [];
  const total = data?.total ?? 0;

  return (
    <section className="mt-10 min-w-0" id="producer-reviews">
      <header className="rounded-xl border border-border/80 bg-bg-muted/30 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-white sm:text-xl">
          Comentarios sobre sus eventos
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Reseñas públicas vinculadas a eventos de esta productora
        </p>
      </header>

      {isError ? (
        <div className="mt-6">
          <QueryError
            message="No pudimos cargar los comentarios."
            onRetry={() => void refetch()}
          />
        </div>
      ) : isLoading ? (
        <ReviewListSkeleton count={2} />
      ) : reviews.length === 0 ? (
        <div className="mt-6">
          <ReviewEmptyState
            variant="none"
            message="Todavía no hay comentarios públicos"
            submessage="Cuando alguien valore un evento de esta productora, aparecerá aquí"
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="min-w-0 rounded-xl border border-border/80 bg-bg-muted/50 p-4 sm:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                <div className="flex shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 sm:w-[4.5rem] sm:flex-col">
                  <span className="text-2xl font-bold tabular-nums text-amber-400 sm:text-3xl">
                    {r.rating}
                  </span>
                  <span className="text-xs text-text-muted">/5</span>
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/events/${r.eventId}?tenantId=${encodeURIComponent(tenantId)}`}
                    className="font-medium text-accent transition-colors hover:underline"
                  >
                    {r.eventTitle}
                  </Link>
                  {r.comment ? (
                    <p className="mt-2 text-sm leading-relaxed text-text-muted break-words">
                      {r.comment}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-text-muted">
                    {r.userDisplayName} ·{' '}
                    {new Date(r.createdAt).toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!isError && !isLoading ? (
        <ReviewPagination
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      ) : null}
    </section>
  );
}
