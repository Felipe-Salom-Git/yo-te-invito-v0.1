'use client';

import { getCategoryLabel } from '@/lib/home/contentRoutes';
import { formatPublicRatingLabel } from '@/lib/reviews/ratingDisplay';

export interface EventMetaSummaryProps {
  ratingAvg?: number | null;
  ratingCount?: number;
  city?: string | null;
  startAt?: string | null;
  category?: string;
}

export function EventMetaSummary({
  ratingAvg,
  ratingCount,
  city,
  startAt,
  category,
}: EventMetaSummaryProps) {
  const dateLabel = startAt
    ? new Date(startAt).toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : null;
  const categoryLabel = category ? getCategoryLabel(category) : null;

  const items: Array<{ icon: string; label: string }> = [];
  const ratingLabel = formatPublicRatingLabel(ratingAvg);
  if (ratingLabel && ratingCount != null && ratingCount > 0) {
    items.push({
      icon: '★',
      label: `${ratingLabel} (${ratingCount} reseñas)`,
    });
  } else if (ratingLabel) {
    items.push({ icon: '★', label: ratingLabel });
  }
  if (city) items.push({ icon: '📍', label: city });
  if (dateLabel) items.push({ icon: '📅', label: dateLabel });
  if (categoryLabel) {
    const icon =
      category === 'gastro'
        ? '🍽'
        : category === 'hotel'
          ? '🏨'
          : category === 'excursion'
            ? '🥾'
            : category === 'rental'
              ? '🏠'
              : '🎫';
    items.push({ icon, label: categoryLabel });
  }

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-muted">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span aria-hidden>{item.icon}</span>
          {item.label}
        </span>
      ))}
    </div>
  );
}
