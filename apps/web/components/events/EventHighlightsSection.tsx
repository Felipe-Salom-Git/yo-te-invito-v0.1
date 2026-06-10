'use client';

import { getCategoryLabel } from '@/lib/home/contentRoutes';
import { shouldShowPublicEventDate } from '@/lib/public/publicContentDates';

export interface EventHighlightsSectionProps {
  category?: string;
  city?: string | null;
  venueName?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  capacityTotal?: number | null;
  /** Optional duration in minutes; not in EventDetail, omit if unavailable */
  durationMinutes?: number | null;
  className?: string;
}

export function EventHighlightsSection({
  category,
  city,
  venueName,
  startAt,
  endAt,
  capacityTotal,
  className = 'mt-10',
}: EventHighlightsSectionProps) {
  const items: Array<{ icon: string; label: string }> = [];

  if (category) {
    items.push({
      icon: '🎫',
      label: getCategoryLabel(category),
    });
  }
  if (venueName) {
    items.push({ icon: '📍', label: venueName });
  }
  if (city) {
    items.push({ icon: '🏙', label: city });
  }
  if (startAt && shouldShowPublicEventDate(category)) {
    const d = new Date(startAt);
    items.push({
      icon: '📅',
      label: d.toLocaleDateString('es-AR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
    });
  }
  if (endAt && endAt !== startAt) {
    const d = new Date(endAt);
    items.push({
      icon: '🕐',
      label: `Hasta ${d.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
    });
  }
  if (capacityTotal != null && capacityTotal > 0) {
    items.push({
      icon: '👥',
      label: capacityTotal <= 100 ? `${capacityTotal} personas` : 'Evento con capacidad',
    });
  }

  if (items.length === 0) return null;

  return (
    <section className={className}>
      <h2 className="text-lg font-semibold text-white mb-3">Lo que incluye</h2>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-muted/80 px-4 py-2 text-sm text-text-muted"
          >
            <span aria-hidden>{item.icon}</span>
            {item.label}
          </span>
        ))}
      </div>
    </section>
  );
}
