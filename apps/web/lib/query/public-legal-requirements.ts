import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { publicLegalKeys } from '@/lib/query/keys';
import type {
  LegalAcceptanceContext,
  RegistrationProfileType,
} from '@yo-te-invito/shared';

export function usePublicLegalRequirements(
  context: LegalAcceptanceContext,
  profileType?: RegistrationProfileType,
  enabled = true,
) {
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const effectiveTenant = tenantId || 'tenant-demo';

  return useQuery({
    queryKey: publicLegalKeys.requirements(
      effectiveTenant,
      context,
      profileType,
    ),
    queryFn: () =>
      repos.legalDocuments.getPublicLegalRequirements({
        tenantId: effectiveTenant,
        context,
        profileType,
      }),
    enabled: enabled && !!effectiveTenant,
    staleTime: 60_000,
  });
}
