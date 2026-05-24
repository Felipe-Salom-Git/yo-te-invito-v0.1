import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { meLegalKeys } from '@/lib/query/keys';
import type {
  MeLegalAcceptRequest,
  MeLegalRequirementsQuery,
} from '@/repositories/interfaces';

export function useMyLegalRequirements(
  query: MeLegalRequirementsQuery,
  enabled = true,
) {
  const repos = useRepositories();
  return useQuery({
    queryKey: meLegalKeys.requirements(query.context, query.profileType),
    queryFn: () => repos.legalDocuments.getMyLegalRequirements(query),
    enabled,
  });
}

export function useAcceptLegalDocuments() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MeLegalAcceptRequest) =>
      repos.legalDocuments.acceptMyLegalDocuments(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: meLegalKeys.all });
      queryClient.invalidateQueries({
        queryKey: meLegalKeys.requirements(variables.context),
      });
    },
  });
}

export function useMyLegalAcceptances(enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: meLegalKeys.acceptances(),
    queryFn: () => repos.legalDocuments.getMyLegalAcceptances(),
    enabled,
  });
}
