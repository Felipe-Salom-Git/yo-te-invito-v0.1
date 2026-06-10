import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { producerEventLegalKeys } from '@/lib/query/keys';

export function useEventPublicationLegalStatus(eventId: string | undefined, enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: producerEventLegalKeys.publicationTerms(eventId ?? ''),
    queryFn: () => repos.events.getEventPublicationLegalStatus(eventId!),
    enabled: Boolean(eventId) && enabled,
  });
}

export function useAcceptEventPublicationTerms(eventId: string) {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => repos.events.acceptEventPublicationTerms(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: producerEventLegalKeys.publicationTerms(eventId),
      });
    },
  });
}
