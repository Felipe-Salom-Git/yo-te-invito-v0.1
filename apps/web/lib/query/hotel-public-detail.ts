'use client';

import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { publicHotelKeys } from '@/lib/query/keys';

export function useHotelPublicLocation(params: {
  tenantId: string;
  locationId?: string;
  eventId?: string;
}) {
  const repos = useRepositories();
  const { tenantId, locationId, eventId } = params;
  const enabled = Boolean(locationId || eventId);

  return useQuery({
    queryKey: eventId
      ? publicHotelKeys.byEvent(eventId, tenantId)
      : publicHotelKeys.detail(locationId ?? '', tenantId),
    queryFn: () =>
      eventId
        ? repos.publicHotel.getByPublicEventId(eventId, tenantId)
        : repos.publicHotel.getById(locationId!, tenantId),
    enabled,
    retry: false,
  });
}
