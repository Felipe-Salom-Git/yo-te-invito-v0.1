'use client';

import {
  INTERNAL_RATING_MAX,
  PUBLIC_RATING_STARS_MAX,
  internalTenToVisualStars,
  visualFaceMeta,
  visualStarsToInternalTen,
} from '@/lib/reviews/ratingDisplay';

export interface RatingInputProps {
  /** Internal 1–10 when `scale="internal"` (default); 1–5 when `scale="visual"`. */
  value: number;
  onChange: (value: number) => void;
  label?: string;
  /** Public reviews: 5 faces ↔ internal 1–10. Commercial B2B may use `internal` 1–10. */
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
  const levels = Array.from({ length: max }, (_, i) => i + 1);

  const handleSelect = (n: number) => {
    onChange(isVisual ? visualStarsToInternalTen(n) : n);
  };

  return (
    <div>
      {label && (
        <p className="mb-2 text-sm font-medium text-text-muted">{label}</p>
      )}
      <div className="flex flex-wrap gap-1" role="group" aria-label={label ?? 'Valoración'}>
        {levels.map((n) => {
          const face = isVisual ? visualFaceMeta(n) : null;
          const selected = displayValue === n || (!isVisual && value === n);
          const filled = displayValue >= n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => handleSelect(n)}
              className={`h-11 w-11 rounded-lg border text-xl transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg ${
                selected
                  ? 'border-accent bg-accent/15'
                  : 'border-border bg-bg/50 hover:border-accent/50 hover:bg-accent/10'
              }`}
              aria-label={
                isVisual && face
                  ? `${n} de ${max}: ${face.label}`
                  : `${n} de ${max}`
              }
              aria-pressed={selected}
            >
              {isVisual && face ? (
                <span className={filled ? face.className : 'text-text-muted'} aria-hidden>
                  {face.glyph}
                </span>
              ) : (
                <span className={filled ? 'text-accent' : 'text-text-muted'} aria-hidden>
                  ★
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-text-muted">
        {isVisual
          ? `${visualFaceMeta(displayValue).label} (${displayValue} de ${PUBLIC_RATING_STARS_MAX})`
          : `${value} de ${INTERNAL_RATING_MAX}`}
      </p>
    </div>
  );
}
