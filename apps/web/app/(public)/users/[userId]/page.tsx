'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { UserReviewBadge } from '@/components/reviews/UserReviewBadge';
import { ReviewCard } from '@/components/reviews/ReviewCard';

const TENANT = 'tenant-demo';

export default function UserPublicReviewsPage() {
  const { userId } = useParams<{ userId: string }>();
  const repos = useRepositories();
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', userId, 'reviews', TENANT, page],
    queryFn: () => repos.reviews.listUserPublicReviews(userId, TENANT, page, 10),
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg p-8">
        <div className="animate-pulse h-8 w-48 rounded bg-bg-muted" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-bg p-8 text-text-muted">
        No se pudo cargar el perfil.
      </div>
    );
  }

  const { profile, reviews, total } = data;
  const totalPages = Math.ceil(total / 10);

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <header className="border-b border-border pb-6">
          <h1 className="text-2xl font-semibold text-white">{profile.displayName}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <UserReviewBadge tier={profile.reviewerTier} />
            <span className="text-sm text-text-muted">
              {profile.visibleReviewCount} valoraciones públicas visibles
            </span>
          </div>
        </header>

        <section className="mt-8 space-y-4">
          {reviews.length === 0 ? (
            <p className="text-text-muted">Sin comentarios públicos visibles.</p>
          ) : (
            reviews.map((r) => (
              <div key={r.id} className="space-y-1">
                <p className="text-xs text-text-muted">
                  {r.entityTitle} · {r.category}
                </p>
                <ReviewCard review={r} />
              </div>
            ))
          )}
        </section>

        {totalPages > 1 && (
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page * 10 >= total}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
