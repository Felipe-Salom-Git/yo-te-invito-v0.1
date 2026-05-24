'use client';

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useMyLegalRequirements } from '@/lib/query/me-legal';
import type { ReferrerDashboardResponse } from '@/repositories/interfaces';
import { getReferrerPortalOnboarding } from '@/lib/onboarding/referrer-portal-onboarding';
import { OnboardingChecklistCard } from './OnboardingChecklistCard';

type Props = {
  dashboard: ReferrerDashboardResponse;
  className?: string;
};

export function ReferrerOnboardingChecklist({ dashboard, className = '' }: Props) {
  const { status } = useSession();
  const repos = useRepositories();

  const relationshipsQuery = useQuery({
    queryKey: ['referrer', 'producer-relationships', 'onboarding'],
    queryFn: () => repos.referrals.listReferrerProducerRelationships(),
    enabled: status === 'authenticated',
  });

  const legalQuery = useMyLegalRequirements(
    { context: 'PORTAL_ACCESS', profileType: 'REFERRER' },
    status === 'authenticated',
  );

  const result = useMemo(
    () =>
      getReferrerPortalOnboarding({
        dashboard,
        producerRelationships: relationshipsQuery.data ?? [],
        portalLegalPending: Boolean(legalQuery.data && !legalQuery.data.allAccepted),
      }),
    [dashboard, relationshipsQuery.data, legalQuery.data],
  );

  if (relationshipsQuery.isLoading) {
    return null;
  }

  return <OnboardingChecklistCard result={result} className={className} />;
}
