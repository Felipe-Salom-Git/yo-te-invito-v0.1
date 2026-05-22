'use client';

import Link from 'next/link';
import { QueryError, Skeleton } from '@/components';
import { isApiNotFoundError } from '@/lib/errors';
import { hasActivePublicReviewFilters } from '@/lib/reviews/publicReviewListFilters';
import { useUserPublicReviewsState, userPublicReviewsPageSize } from '@/lib/query/reviews';
import { PublicReviewsFiltersBar } from './PublicReviewsFiltersBar';
import { ReviewCard } from './ReviewCard';
import { ReviewEmptyState } from './ReviewEmptyState';
import { ReviewListSkeleton } from './ReviewListSkeleton';
import { ReviewPagination } from './ReviewPagination';
import { UserReviewerNotFound } from './UserReviewerNotFound';
import { UserReviewerProfileHeader } from './UserReviewerProfileHeader';
import { UserReviewerProfileStats } from './UserReviewerProfileStats';

const DEFAULT_TENANT = 'tenant-demo';

type Props = {
  userId: string;
  tenantId?: string;
};

export function UserPublicReviewerPage({
  userId,
  tenantId = DEFAULT_TENANT,
}: Props) {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    page,
    setPage,
    filters,
    setFilters,
  } = useUserPublicReviewsState(userId, tenantId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
          <Link
            href="/home"
            className="mb-6 inline-block text-sm text-text-muted transition-colors hover:text-white"
          >
            ← Volver
          </Link>
          <div className="rounded-xl border border-border/80 bg-bg-muted/30 p-5 sm:p-6">
            <div className="flex gap-4">
              <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="mt-3 h-4 w-full max-w-sm" />
                <Skeleton className="mt-2 h-5 w-28 rounded-full" />
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
          <ReviewListSkeleton count={2} />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    if (isApiNotFoundError(error)) {
      return (
        <div className="min-h-screen bg-bg">
          <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
            <UserReviewerNotFound />
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-bg">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
          <QueryError
            message="No pudimos cargar el perfil de comentarista."
            onRetry={() => void refetch()}
          />
        </div>
      </div>
    );
  }

  const { profile, reviews, total } = data;
  const hasReviews = profile.visibleReviewCount > 0;
  const filtersActive = hasActivePublicReviewFilters(filters);

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/home"
          className="mb-6 inline-block text-sm text-text-muted transition-colors hover:text-white"
        >
          ← Volver
        </Link>

        <UserReviewerProfileHeader profile={profile} />
        <UserReviewerProfileStats profile={profile} />

        <section className="mt-10 min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">Historial de valoraciones</h2>
            {hasReviews ? (
              <p className="text-xs text-text-muted">
                Solo reseñas públicas visibles · sin datos privados
              </p>
            ) : null}
          </div>

          {hasReviews ? (
            <PublicReviewsFiltersBar
              className="mt-6"
              filters={filters}
              onChange={setFilters}
            />
          ) : null}

          {isFetching && !isLoading ? (
            <p className="mt-2 text-xs text-text-muted" aria-live="polite">
              Actualizando…
            </p>
          ) : null}

          {!hasReviews || reviews.length === 0 ? (
            <div className="mt-6">
              <ReviewEmptyState
                variant={filtersActive || hasReviews ? 'no-public' : 'none'}
                message={
                  filtersActive
                    ? 'Ninguna valoración coincide con estos filtros'
                    : hasReviews
                      ? 'No hay reseñas visibles en esta página'
                      : 'Sin valoraciones públicas todavía'
                }
                submessage={
                  filtersActive
                    ? 'Probá cambiar el orden, el puntaje o el filtro de respuesta oficial'
                    : hasReviews
                      ? 'Algunas reseñas pueden estar en moderación u ocultas'
                      : 'Cuando publique valoraciones visibles, aparecerán aquí'
                }
              />
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {reviews.map((r) => (
                <ReviewCard
                  key={r.id}
                  review={r}
                  showEntityContext
                  tenantId={tenantId}
                />
              ))}
            </div>
          )}

          {hasReviews ? (
            <ReviewPagination
              page={page}
              total={total}
              pageSize={userPublicReviewsPageSize}
              onPageChange={setPage}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}
