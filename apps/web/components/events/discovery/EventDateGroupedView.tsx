'use client';

import { useMemo } from 'react';
import type { EventSummary } from '@/repositories/interfaces';
import { groupEventsByMonth } from '@/lib/events/discovery/groupEventsByMonth';
import { ContentRail } from '@/components/home/ContentRail';
import type { ContentCardItem } from '@/components/home/ContentCard';

export function EventDateGroupedView({
  events,
  isLoading,
  onCardClick,
}: {
  events: EventSummary[];
  isLoading?: boolean;
  onCardClick?: (item: ContentCardItem) => void;
}) {
  const groups = useMemo(() => groupEventsByMonth(events), [events]);

  if (isLoading) {
    return <p className="px-4 text-center text-sm text-white/60 sm:px-6">Cargando eventos…</p>;
  }

  if (groups.length === 0) {
    return (
      <p className="px-4 text-center text-sm text-white/60 sm:px-6">
        No hay eventos en las próximas fechas.
      </p>
    );
  }

  return (
    <>
      {groups.map((group) => (
        <ContentRail
          key={group.key}
          sectionId={`month-${group.key}`}
          title={group.label}
          subtitle={`${group.items.length} evento${group.items.length === 1 ? '' : 's'}`}
          items={group.items as ContentCardItem[]}
          isLoading={false}
          onCardClick={onCardClick}
          headingVariant="category"
        />
      ))}
    </>
  );
}
