'use client';

import {
  USER_REVIEWER_TIER_LABELS_ES,
  type UserReviewerTier,
} from '@yo-te-invito/shared';

const TIER_STYLES: Record<UserReviewerTier, string> = {
  NEW: 'border-border text-text-muted',
  ACTIVE: 'border-accent/40 text-accent',
  TRUSTED: 'border-emerald-500/50 text-emerald-400',
  UNDER_OBSERVATION: 'border-amber-500/50 text-amber-400',
  LOW_RELIABILITY: 'border-red-500/40 text-red-400',
};

export function UserReviewBadge({ tier }: { tier: UserReviewerTier }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TIER_STYLES[tier]}`}
    >
      {USER_REVIEWER_TIER_LABELS_ES[tier]}
    </span>
  );
}
