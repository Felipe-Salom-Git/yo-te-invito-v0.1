'use client';

/** Compact info chips for content preview — only renders when data exists */

export interface ContentPreviewChipsProps {
  ratingCount?: number | null;
  venueName?: string | null;
  city?: string | null;
  categoryLabel?: string | null;
  dateLabel?: string | null;
  priceLabel?: string | null;
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-white/8 px-3 py-1.5 text-xs font-medium text-white/90">
      {children}
    </span>
  );
}

export function ContentPreviewChips({
  ratingCount,
  venueName,
  city,
  categoryLabel,
  dateLabel,
  priceLabel,
}: ContentPreviewChipsProps) {
  const chips: React.ReactNode[] = [];

  if (ratingCount != null && ratingCount > 0) {
    chips.push(<Chip key="reviews">{ratingCount} valoraciones</Chip>);
  }
  if (venueName) {
    chips.push(<Chip key="venue">{venueName}</Chip>);
  }
  if (city && city !== venueName) {
    chips.push(<Chip key="city">{city}</Chip>);
  }
  if (categoryLabel) {
    chips.push(<Chip key="cat">{categoryLabel}</Chip>);
  }
  if (dateLabel) {
    chips.push(<Chip key="date">{dateLabel}</Chip>);
  }
  if (priceLabel) {
    chips.push(<Chip key="price">{priceLabel}</Chip>);
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Resumen">
      {chips}
    </div>
  );
}
