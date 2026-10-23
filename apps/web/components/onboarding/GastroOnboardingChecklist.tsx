'use client';

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useGastroDashboard } from '@/lib/query/gastro-dashboard';
import { useGastroActiveLocation } from '@/lib/gastro/GastroActiveLocationContext';
import { gastroKeys } from '@/lib/query/keys';
import { useMyLegalRequirements } from '@/lib/query/me-legal';
import { getGastroPortalOnboarding } from '@/lib/onboarding/gastro-portal-onboarding';
import { OnboardingChecklistCard } from './OnboardingChecklistCard';

export function GastroOnboardingChecklist() {
  const { status } = useSession();
  const repos = useRepositories();
  const { profileId } = useGastroActiveLocation();
  const dashboardQuery = useGastroDashboard(status === 'authenticated');

  const localQuery = useQuery({
    queryKey: gastroKeys.local(profileId),
    queryFn: () => repos.gastro.getMyLocal(profileId),
    enabled: status === 'authenticated' && !!profileId,
  });

  const legalQuery = useMyLegalRequirements(
    { context: 'PORTAL_ACCESS', profileType: 'GASTRO' },
    status === 'authenticated',
  );

  const result = useMemo(() => {
    if (!dashboardQuery.data) return null;
    return getGastroPortalOnboarding(
      dashboardQuery.data,
      localQuery.data,
      Boolean(legalQuery.data && !legalQuery.data.allAccepted),
    );
  }, [dashboardQuery.data, localQuery.data, legalQuery.data]);

  if (dashboardQuery.isLoading || localQuery.isLoading || !result) {
    return null;
  }

  return <OnboardingChecklistCard result={result} className="mt-8" />;
}
