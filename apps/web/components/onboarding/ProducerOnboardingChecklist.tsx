'use client';

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useProducerId } from '@/hooks/useProducerId';
import { useTenant } from '@/hooks/useTenant';
import { producersKeys } from '@/lib/query/keys';
import { useMyLegalRequirements } from '@/lib/query/me-legal';
import { getProducerPortalOnboarding } from '@/lib/onboarding/producer-portal-onboarding';
import { OnboardingChecklistCard } from './OnboardingChecklistCard';

export function ProducerOnboardingChecklist() {
  const { status } = useSession();
  const repos = useRepositories();
  const producerId = useProducerId();
  const { tenantId } = useTenant();

  const profileQuery = useQuery({
    queryKey: producersKeys.myProfile(),
    queryFn: () => repos.producers.getMyProfile(),
    enabled: status === 'authenticated',
  });

  const eventsQuery = useQuery({
    queryKey: ['events', 'producer', 'onboarding-count', producerId, tenantId],
    queryFn: () =>
      repos.events.list({ tenantId, producerId, limit: 1 }),
    enabled: status === 'authenticated',
  });

  const legalQuery = useMyLegalRequirements(
    { context: 'PORTAL_ACCESS', profileType: 'PRODUCER' },
    status === 'authenticated',
  );

  const result = useMemo(
    () =>
      getProducerPortalOnboarding({
        profile: profileQuery.data ?? null,
        eventsCount: eventsQuery.data?.data?.length ?? 0,
        portalLegalPending: Boolean(legalQuery.data && !legalQuery.data.allAccepted),
      }),
    [profileQuery.data, eventsQuery.data?.data?.length, legalQuery.data],
  );

  if (profileQuery.isLoading || eventsQuery.isLoading) {
    return null;
  }

  return <OnboardingChecklistCard result={result} className="mt-6" />;
}
