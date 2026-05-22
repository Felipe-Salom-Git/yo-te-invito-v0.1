'use client';

import type { PublicReviewCategory, UserPublicReviewProfile } from '@yo-te-invito/shared';
import { PUBLIC_REVIEW_CATEGORY_LABELS } from '@/lib/reviews/publicReviewRoutes';

type Props = {
  profile: UserPublicReviewProfile;
};

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border/60 bg-bg/40 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-text-muted">{hint}</p> : null}
    </div>
  );
}

function formatCategories(categories: PublicReviewCategory[]): string {
  if (categories.length === 0) return '—';
  return categories
    .map((c) => PUBLIC_REVIEW_CATEGORY_LABELS[c])
    .join(' · ');
}

export function UserReviewerProfileStats({ profile }: Props) {
  const count = profile.visibleReviewCount;
  const avg =
    profile.averageOverallRating != null && profile.averageOverallRating > 0
      ? `${profile.averageOverallRating.toFixed(1)} /10`
      : '—';

  return (
    <section
      className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      aria-label="Resumen de reputación"
    >
      <StatCard
        label="Reseñas públicas"
        value={String(count)}
        hint={count === 1 ? 'valoración visible' : 'valoraciones visibles'}
      />
      <StatCard label="Promedio general" value={avg} />
      <StatCard
        label="Verticales"
        value={
          profile.categoriesCommented.length > 0
            ? String(profile.categoriesCommented.length)
            : '—'
        }
        hint={formatCategories(profile.categoriesCommented)}
      />
      <StatCard
        label="Con respuesta oficial"
        value={String(profile.reviewsWithOfficialReplyCount)}
        hint="Establecimientos u organizadores respondieron"
      />
    </section>
  );
}
