'use client';

import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { publicGastroKeys } from '@/lib/query/keys';

export function useGastroPublicLocation(params: {
  tenantId: string;
  locationId?: string;
  eventId?: string;
}) {
  const repos = useRepositories();
  const { tenantId, locationId, eventId } = params;
  const enabled = Boolean(locationId || eventId);

  return useQuery({
    queryKey: eventId
      ? publicGastroKeys.byEvent(eventId, tenantId)
      : publicGastroKeys.detail(locationId ?? '', tenantId),
    queryFn: () =>
      eventId
        ? repos.publicGastro.getByPublicEventId(eventId, tenantId)
        : repos.publicGastro.getById(locationId!, tenantId),
    enabled,
  });
}

export function useGastroPublicDiscounts(
  locationId: string | undefined,
  tenantId: string,
  enabled = true,
) {
  const repos = useRepositories();
  return useQuery({
    queryKey: publicGastroKeys.discounts(locationId ?? '', tenantId),
    queryFn: () => repos.publicGastro.listDiscounts(locationId!, tenantId),
    enabled: enabled && !!locationId,
  });
}
