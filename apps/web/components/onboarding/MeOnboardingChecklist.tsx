'use client';

import { useMemo } from 'react';
import { useMeDashboard, usePortalPreferences } from '@/lib/query/me-portal';
import { getUserPortalOnboarding } from '@/lib/onboarding/user-portal-onboarding';
import { OnboardingChecklistCard } from './OnboardingChecklistCard';

export function MeOnboardingChecklist() {
  const dashboardQuery = useMeDashboard();
  const preferencesQuery = usePortalPreferences();

  const result = useMemo(
    () => getUserPortalOnboarding(dashboardQuery.data, preferencesQuery.data),
    [dashboardQuery.data, preferencesQuery.data],
  );

  if (dashboardQuery.isLoading || preferencesQuery.isLoading) {
    return null;
  }

  return <OnboardingChecklistCard result={result} className="mt-6" />;
}
