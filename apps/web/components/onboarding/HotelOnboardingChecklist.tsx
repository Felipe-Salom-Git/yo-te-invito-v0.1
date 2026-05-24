'use client';

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import type { HotelProfile } from '@/repositories/interfaces';
import { useMyLegalRequirements } from '@/lib/query/me-legal';
import { getHotelPortalOnboarding } from '@/lib/onboarding/hotel-portal-onboarding';
import { OnboardingChecklistCard } from './OnboardingChecklistCard';

type Props = {
  profile: HotelProfile;
  className?: string;
};

export function HotelOnboardingChecklist({ profile, className = '' }: Props) {
  const { status } = useSession();
  const legalQuery = useMyLegalRequirements(
    { context: 'PORTAL_ACCESS', profileType: 'HOTEL' },
    status === 'authenticated',
  );

  const result = useMemo(
    () =>
      getHotelPortalOnboarding(
        profile,
        Boolean(legalQuery.data && !legalQuery.data.allAccepted),
      ),
    [profile, legalQuery.data],
  );

  return <OnboardingChecklistCard result={result} className={className} />;
}
