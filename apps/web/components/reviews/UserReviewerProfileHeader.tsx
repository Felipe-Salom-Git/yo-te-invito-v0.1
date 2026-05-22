'use client';

import type { UserPublicReviewProfile } from '@yo-te-invito/shared';
import { USER_REVIEWER_TIER_SUMMARY_ES } from '@yo-te-invito/shared';
import { UserReviewBadge } from './UserReviewBadge';
import { UserReviewerAvatar } from './UserReviewerAvatar';

type Props = {
  profile: UserPublicReviewProfile;
};

export function UserReviewerProfileHeader({ profile }: Props) {
  const tierSummary = USER_REVIEWER_TIER_SUMMARY_ES[profile.reviewerTier];
  const hasAverage =
    profile.averageOverallRating != null && profile.averageOverallRating > 0;

  return (
    <header className="rounded-xl border border-border/80 bg-bg-muted/30 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <UserReviewerAvatar
          displayName={profile.displayName}
          avatarUrl={profile.avatarUrl}
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-white sm:text-2xl">
            {profile.displayName}
          </h1>
          <p className="mt-1 text-sm text-text-muted">Perfil público de comentarista</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <UserReviewBadge tier={profile.reviewerTier} />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">{tierSummary}</p>
        </div>
        {hasAverage ? (
          <div
            className="flex shrink-0 items-baseline gap-1 self-start sm:text-right"
            aria-label={`Promedio ${profile.averageOverallRating!.toFixed(1)} de 10`}
          >
            <span className="text-3xl font-bold tabular-nums text-white sm:text-4xl">
              {profile.averageOverallRating!.toFixed(1)}
            </span>
            <span className="pb-0.5 text-sm text-text-muted">/10</span>
          </div>
        ) : null}
      </div>
    </header>
  );
}
