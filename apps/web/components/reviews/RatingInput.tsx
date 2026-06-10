'use client';

import {
  INTERNAL_RATING_MAX,
  PUBLIC_RATING_STARS_MAX,
  internalTenToVisualStars,
  visualStarsToInternalTen,
} from '@/lib/reviews/ratingDisplay';

export interface RatingInputProps {
  /** Internal 1–10 when `scale="internal"` (default); 1–5 when `scale="visual"`. */
  value: number;
  onChange: (value: number) => void;
  label?: string;
  /** Public reviews: 5 stars ↔ internal 1–10. Commercial B2B may use `internal` 1–10. */
  scale?: 'internal' | 'visual';
}

export function RatingInput({
  value,
  onChange,
  label,
  scale = 'visual',
}: RatingInputProps) {
  const isVisual = scale === 'visual';
  const max = isVisual ? PUBLIC_RATING_STARS_MAX : INTERNAL_RATING_MAX;
  const displayValue = isVisual ? internalTenToVisualStars(value) : value;
  const stars = Array.from({ length: max }, (_, i) => i + 1);

  const handleSelect = (n: number) => {
    onChange(isVisual ? visualStarsToInternalTen(n) : n);
  };

  return (
    <div>
      {label && (
        <p className="mb-2 text-sm font-medium text-text-muted">{label}</p>
      )}
      <div className="flex gap-1">
        {stars.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => handleSelect(n)}
            className="h-10 w-10 rounded-lg border border-border bg-bg/50 text-xl transition-colors hover:border-accent/50 hover:bg-accent/10 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
            aria-label={`${n} de ${max} estrellas`}
          >
            <span className={displayValue >= n ? 'text-accent' : 'text-text-muted'}>
              ★
            </span>
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-text-muted">
        {isVisual ? `${displayValue} de ${PUBLIC_RATING_STARS_MAX}` : `${value} de ${INTERNAL_RATING_MAX}`}
      </p>
    </div>
  );
}
