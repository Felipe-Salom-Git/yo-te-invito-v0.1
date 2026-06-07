'use client';

import { formatPublicRatingLabel, publicRatingAriaLabel } from '@/lib/reviews/ratingDisplay';

/** Scannable metadata row for content preview modal — date, location, rating, price */

export interface ContentPreviewMetaProps {
  dateLabel: string | null;
  locationLabel: string | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  priceLabel: string | null;
}

export function ContentPreviewMeta({
  dateLabel,
  locationLabel,
  ratingAvg,
  ratingCount,
  priceLabel,
}: ContentPreviewMetaProps) {
  const parts: React.ReactNode[] = [];

  if (dateLabel) {
    parts.push(<span key="date">{dateLabel}</span>);
  }
  if (locationLabel) {
    parts.push(
      <span key="loc" className="text-white/90">
        {locationLabel}
      </span>
    );
  }
  const ratingLabel = formatPublicRatingLabel(ratingAvg);
  if (ratingLabel && ratingAvg != null && ratingAvg > 0) {
    parts.push(
      <span
        key="rating"
        className="text-accent font-medium"
        aria-label={publicRatingAriaLabel(ratingAvg)}
      >
        ★ {ratingLabel}
        {ratingCount != null && ratingCount > 0 && (
          <span className="text-text-muted font-normal"> ({ratingCount})</span>
        )}
      </span>
    );
  }
  if (priceLabel) {
    parts.push(
      <span key="price" className="text-accent font-semibold">
        {priceLabel}
      </span>
    );
  }

  if (parts.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
      role="group"
      aria-label="Información del evento"
    >
      {parts.reduce<React.ReactNode[]>((acc, child, i) => {
        if (i > 0) {
          acc.push(
            <span key={`sep-${i}`} className="text-white/30 select-none" aria-hidden>
              ·
            </span>
          );
        }
        acc.push(child);
        return acc;
      }, [])}
    </div>
  );
}
