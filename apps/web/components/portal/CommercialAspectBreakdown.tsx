'use client';

import type { CommercialReviewTarget } from '@yo-te-invito/shared';
import {
  COMMERCIAL_PRODUCER_ASPECT_LABELS_ES,
  COMMERCIAL_REFERRER_ASPECT_LABELS_ES,
} from '@yo-te-invito/shared';

type Props = {
  targetType: CommercialReviewTarget;
  aspectRatings: Record<string, number> | null | undefined;
};

export function CommercialAspectBreakdown({ targetType, aspectRatings }: Props) {
  if (!aspectRatings || Object.keys(aspectRatings).length === 0) return null;

  const labels =
    targetType === 'REFERRER'
      ? COMMERCIAL_REFERRER_ASPECT_LABELS_ES
      : COMMERCIAL_PRODUCER_ASPECT_LABELS_ES;

  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      {Object.entries(aspectRatings).map(([key, score]) => (
        <div
          key={key}
          className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-bg px-3 py-2 text-xs"
        >
          <span className="text-text-muted">{labels[key as keyof typeof labels] ?? key}</span>
          <span className="font-medium text-accent">
            {score}
            <span className="font-normal text-text-muted"> /10</span>
          </span>
        </div>
      ))}
    </div>
  );
}
